import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const QueueVideoRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
});

type QueuedGeneration = {
  generation_id: string;
  order_id: string;
  attempt_number: number;
  status: string;
  provider_request_id: string;
  estimated_cost_cents: number;
  created_at: string;
};

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

function getEstimatedCostCents(): number {
  const rawValue =
    process.env
      .VIMMOAI_VIDEO_ESTIMATED_COST_CENTS ??
    "500";

  const parsedValue = Number(rawValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 3000
  ) {
    throw new Error(
      "VIMMOAI_VIDEO_ESTIMATED_COST_CENTS must be an integer between 1 and 3000",
    );
  }

  return parsedValue;
}

function getSafeDatabaseError(
  message?: string,
): {
  message: string;
  status: number;
} {
  if (!message) {
    return {
      message:
        "Der Videoauftrag konnte nicht reserviert werden.",
      status: 500,
    };
  }

  if (
    message.includes(
      "Generation attempt limit reached",
    )
  ) {
    return {
      message:
        "Für dieses Projekt wurde die maximale Anzahl an Videogenerierungen erreicht.",
      status: 409,
    };
  }

  if (
    message.includes(
      "Daily video generation budget reached",
    ) ||
    message.includes(
      "Monthly video generation budget reached",
    )
  ) {
    return {
      message:
        "Das interne Produktionslimit wurde erreicht. Bitte versuchen Sie es später erneut.",
      status: 429,
    };
  }

  if (
    message.includes(
      "Order is not ready for video generation",
    )
  ) {
    return {
      message:
        "Das Projekt ist noch nicht für die Videoproduktion bereit.",
      status: 409,
    };
  }

  if (message.includes("Order not found")) {
    return {
      message: "Projekt nicht gefunden.",
      status: 404,
    };
  }

  if (
    message.includes(
      "Administrator access required",
    )
  ) {
    return {
      message:
        "Diese Aktion ist nur für VimmoAI-Administratoren erlaubt.",
      status: 403,
    };
  }

  return {
    message:
      "Der Videoauftrag konnte nicht reserviert werden.",
    status: 500,
  };
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      orderId: string;
    }>;
  },
) {
  const { orderId } = await context.params;

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

  const parsedOrderId =
    z.string().uuid().safeParse(orderId);

  if (!parsedOrderId.success) {
    return NextResponse.json(
      {
        error: "Ungültige Projekt-ID.",
      },
      {
        status: 400,
      },
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const parsedBody =
    QueueVideoRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          "Eine gültige Idempotency-ID ist erforderlich.",
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

  try {
    const estimatedCostCents =
      getEstimatedCostCents();

    /*
     * This RPC performs the actual safety checks:
     *
     * - VimmoAI administrator access
     * - order locking
     * - idempotency
     * - one active job per order
     * - maximum two attempts
     * - daily and monthly cost limits
     * - order must be prompt_ready or eligible for retry
     */
    const {
      data,
      error,
    } = await supabase.rpc(
      "queue_video_generation",
      {
        p_order_id: parsedOrderId.data,
        p_idempotency_key:
          parsedBody.data.idempotencyKey,
        p_estimated_cost_cents:
          estimatedCostCents,
      },
    );

    if (error) {
      console.error(
        "Could not queue video generation:",
        {
          orderId,
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

    const generation =
      Array.isArray(data)
        ? (data[0] as
            | QueuedGeneration
            | undefined)
        : undefined;

    if (!generation) {
      return NextResponse.json(
        {
          error:
            "Der Videoauftrag konnte nicht reserviert werden.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      generation: {
        id: generation.generation_id,
        orderId: generation.order_id,
        attemptNumber:
          generation.attempt_number,
        status: generation.status,
        providerRequestId:
          generation.provider_request_id,
        estimatedCostCents:
          generation.estimated_cost_cents,
        createdAt:
          generation.created_at,
      },
    });
  } catch (error) {
    console.error(
      "Video queue route failed:",
      {
        orderId,
        userId: String(
          authData.claims.sub,
        ),
        error,
      },
    );

    return NextResponse.json(
      {
        error:
          "Der Videoauftrag konnte nicht reserviert werden.",
      },
      {
        status: 500,
      },
    );
  }
}
