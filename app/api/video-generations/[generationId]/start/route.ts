import {
  NextRequest,
  NextResponse,
} from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function validateSameOrigin(
  request: NextRequest,
): boolean {
  const origin =
    request.headers.get("origin");

  const host =
    request.headers.get(
      "x-forwarded-host",
    ) ??
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

function isPaidGenerationEnabled(): boolean {
  return (
    process.env
      .KLING_GENERATION_ENABLED
      ?.trim()
      .toLowerCase() === "true"
  );
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

  /*
   * Only a VimmoAI administrator may reach
   * the generation safety gate.
   */
  const {
    data: isAdmin,
    error: adminError,
  } = await supabase.rpc(
    "is_vimmoai_admin",
  );

  if (adminError) {
    console.error(
      "Could not verify VimmoAI administrator:",
      {
        generationId,
        userId: String(
          authData.claims.sub,
        ),
        error: adminError,
      },
    );

    return NextResponse.json(
      {
        error:
          "Die Berechtigung konnte nicht geprüft werden.",
      },
      {
        status: 500,
      },
    );
  }

  if (isAdmin !== true) {
    return NextResponse.json(
      {
        error:
          "Diese Aktion ist nur für VimmoAI-Administratoren erlaubt.",
      },
      {
        status: 403,
      },
    );
  }

  /*
   * Critical kill switch.
   *
   * This check happens before:
   * - claiming the database job;
   * - changing its status;
   * - creating an image URL;
   * - loading the provider;
   * - contacting Kling.
   */
  if (!isPaidGenerationEnabled()) {
    return NextResponse.json(
      {
        success: false,

        generationStarted: false,
        jobClaimed: false,
        databaseMutated: false,
        providerCalled: false,

        generationId:
          parsedGenerationId.data,

        blockedBy:
          "KLING_GENERATION_ENABLED",

        message:
          "Die kostenpflichtige Videogenerierung ist derzeit sicher deaktiviert.",
      },
      {
        status: 409,
      },
    );
  }

  /*
   * The real controlled generation workflow
   * will be implemented in the next stage.
   *
   * Even when the environment flag becomes
   * true, this version still cannot claim the
   * job or contact Kling.
   */
  return NextResponse.json(
    {
      success: false,

      generationStarted: false,
      jobClaimed: false,
      databaseMutated: false,
      providerCalled: false,

      generationId:
        parsedGenerationId.data,

      blockedBy:
        "CONTROLLED_START_NOT_IMPLEMENTED",

      message:
        "Der kontrollierte Produktionsstart ist noch nicht freigegeben.",
    },
    {
      status: 501,
    },
  );
}
