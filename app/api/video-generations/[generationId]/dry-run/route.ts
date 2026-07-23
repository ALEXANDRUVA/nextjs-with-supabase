import {
  NextRequest,
  NextResponse,
} from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { hasRegisteredVideoProvider } from "@/lib/video/registry";

export const maxDuration = 30;

function validateSameOrigin(
  request: NextRequest,
): boolean {
  const origin = request.headers.get("origin");

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isSupportedDuration(
  value: number | null,
): boolean {
  return value === 5 || value === 10;
}

function getSafeDatabaseError(
  message?: string,
): {
  message: string;
  status: number;
} {
  if (
    message?.includes(
      "Administrator access required",
    )
  ) {
    return {
      message:
        "Diese Aktion ist nur für VimmoAI-Administratoren erlaubt.",
      status: 403,
    };
  }

  if (
    message?.includes(
      "Video generation not found",
    )
  ) {
    return {
      message:
        "Die Videogenerierung wurde nicht gefunden.",
      status: 404,
    };
  }

  if (
    message?.includes(
      "Generation ID is required",
    )
  ) {
    return {
      message:
        "Eine gültige Generierungs-ID ist erforderlich.",
      status: 400,
    };
  }

  return {
    message:
      "Der sichere Testlauf konnte nicht vorbereitet werden.",
    status: 500,
  };
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      generationId: string;
    }>;
  },
) {
  const { generationId } =
    await context.params;

  /*
   * Prevent requests coming from another website.
   */
  if (!validateSameOrigin(request)) {
    return NextResponse.json(
      {
        error: "Ungültige Anfrage.",
      },
      {
        status: 403,
      },
    );
  }

  /*
   * Validate the generation UUID before
   * contacting Supabase.
   */
  const parsedGenerationId =
    z.string().uuid().safeParse(
      generationId,
    );

  if (!parsedGenerationId.success) {
    return NextResponse.json(
      {
        error:
          "Ungültige Generierungs-ID.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = await createClient();

  /*
   * Verify that a real signed-in Supabase
   * user is making the request.
   */
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  if (
    authError ||
    !authData?.claims?.sub
  ) {
    return NextResponse.json(
      {
        error:
          "Bitte melden Sie sich erneut an.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    /*
     * Read the preparation data through the
     * administrator-only, non-mutating RPC.
     *
     * This does not claim the job and does
     * not contact Kling.
     */
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_video_generation_dry_run",
      {
        p_generation_id:
          parsedGenerationId.data,
      },
    );

    if (error) {
      console.error(
        "Could not load video dry run:",
        {
          generationId,
          userId: String(
            authData.claims.sub,
          ),
          error,
        },
      );

      const safeError =
        getSafeDatabaseError(
          error.message,
        );

      return NextResponse.json(
        {
          error: safeError.message,
        },
        {
          status: safeError.status,
        },
      );
    }

    const preparation = data?.[0];

    if (!preparation) {
      return NextResponse.json(
        {
          error:
            "Die Videogenerierung wurde nicht gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Verify that the private original image
     * still exists and can be accessed.
     *
     * The signed URL is discarded immediately
     * and is never returned to the browser.
     */
    const imagePathPresent =
      isNonEmptyString(
        preparation.original_image_path,
      );

    let imageAvailable = false;
    let imageWarning: string | null =
      null;

    if (imagePathPresent) {
      const {
        data: signedImageData,
        error: signedImageError,
      } = await supabase.storage
        .from("original-images")
        .createSignedUrl(
          preparation.original_image_path,
          60,
        );

      imageAvailable =
        !signedImageError &&
        isNonEmptyString(
          signedImageData?.signedUrl,
        );

      if (!imageAvailable) {
        imageWarning =
          "Das Originalbild konnte nicht sicher geladen werden.";
      }
    } else {
      imageWarning =
        "Für diesen Auftrag ist kein Originalbild gespeichert.";
    }

    /*
     * Verify every prerequisite without
     * starting or claiming the generation.
     */
    const checks = {
      jobIsQueued:
        preparation.generation_status ===
        "queued",

      orderIsReady:
        preparation.order_status ===
          "prompt_ready" ||
        preparation.order_status ===
          "video_queued",

      providerIsRegistered:
        hasRegisteredVideoProvider(
          preparation.provider_key,
        ),

      providerIsEnabled:
        preparation.provider_enabled,

      imageToVideoIsSupported:
        preparation
          .provider_supports_image_to_video,

      providerConfigurationIsValid:
        isPlainObject(
          preparation
            .provider_configuration,
        ),

      imagePathIsPresent:
        imagePathPresent,

      imageIsAvailable:
        imageAvailable,

      promptIsReady:
        isNonEmptyString(
          preparation.kling_prompt,
        ),

      negativePromptIsReady:
        isNonEmptyString(
          preparation.negative_prompt,
        ),

      durationIsSupported:
        isSupportedDuration(
          preparation.duration_seconds,
        ),

      recommendedSettingsAreReady:
        isPlainObject(
          preparation
            .recommended_settings,
        ),

      estimatedCostIsValid:
        Number.isInteger(
          preparation
            .estimated_cost_cents,
        ) &&
        preparation
          .estimated_cost_cents > 0,

      paidGenerationIsBlocked:
        process.env
          .KLING_GENERATION_ENABLED
          ?.trim()
          .toLowerCase() !== "true",
    };

    const ready =
      Object.values(checks).every(
        (check) => check === true,
      );

    const failedChecks =
      Object.entries(checks)
        .filter(
          ([, passed]) =>
            passed === false,
        )
        .map(([name]) => name);

    /*
     * Do not return the complete prompts,
     * provider secret configuration or
     * private signed image URL.
     */
    return NextResponse.json({
      success: true,
      dryRun: true,
      ready,

      providerCalled: false,
      jobClaimed: false,
      databaseMutated: false,

      generation: {
        id:
          preparation.generation_id,
        orderId:
          preparation.order_id,
        attemptNumber:
          preparation.attempt_number,
        status:
          preparation.generation_status,
        orderStatus:
          preparation.order_status,
        providerRequestId:
          preparation
            .provider_request_id,
        estimatedCostCents:
          preparation
            .estimated_cost_cents,
      },

      provider: {
        key:
          preparation.provider_key,
        displayName:
          preparation
            .provider_display_name,
        priority:
          preparation
            .provider_priority,
        defaultModel:
          preparation
            .provider_default_model,
      },

      preparation: {
        durationSeconds:
          preparation
            .duration_seconds,
        promptLength:
          preparation.kling_prompt
            ?.trim().length ?? 0,
        negativePromptLength:
          preparation
            .negative_prompt
            ?.trim().length ?? 0,
        imageWarning,
      },

      checks,
      failedChecks,
    });
  } catch (error) {
    console.error(
      "Video dry run route failed:",
      {
        generationId,
        userId: String(
          authData.claims.sub,
        ),
        error,
      },
    );

    return NextResponse.json(
      {
        error:
          "Der sichere Testlauf konnte nicht vorbereitet werden.",
      },
      {
        status: 500,
      },
    );
  }
}
