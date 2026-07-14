import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const AnalysisResultSchema = z.object({
  analysis: z.object({
    room_summary: z.string(),
    visible_architecture: z.array(z.string()),
    architecture_to_preserve: z.array(z.string()),
    visible_materials: z.array(z.string()),
    lighting_conditions: z.string(),
    perspective_observations: z.string(),
    deformation_risks: z.array(z.string()),
    unsuitable_transformations: z.array(z.string()),
    confidence_score: z.number().min(0).max(100),
    human_review_required: z.boolean(),
    human_review_notes: z.string(),
  }),

  kling_prompt: z.string(),

  negative_prompt: z.string(),

  recommended_settings: z.object({
    duration_seconds: z.number().int().min(5).max(15),
    camera_motion: z.string(),
    motion_strength: z.enum(["low", "medium-low", "medium"]),
    image_detail: z.enum(["high"]),
    creativity: z.enum(["low", "medium-low"]),
    aspect_ratio_recommendation: z.string(),
    generation_notes: z.string(),
  }),
});

type ClaimedOrder = {
  id: string;
  original_image_path: string;
  property_type: string | null;
  room_type: string | null;
  style: string | null;
  duration_seconds: number | null;
  camera_motion: string | null;
  usage_type: string | null;
  notes: string | null;
};

function getMimeType(path: string, blobType: string): string {
  if (
    blobType === "image/jpeg" ||
    blobType === "image/png" ||
    blobType === "image/webp"
  ) {
    return blobType;
  }

  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }

  throw new Error("Unsupported image format");
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 2000);
  }

  return "Unknown OpenAI analysis error";
}

function validateSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `
You are the visual analysis and prompt-generation engine for VimmoAI,
a professional German real-estate marketing platform.

Your task is to inspect the supplied property image and prepare a precise
English image-to-video prompt for Kling AI.

NON-NEGOTIABLE RULES:

1. Preserve the exact original architecture.
2. Preserve all visible windows, doors, walls, ceiling lines, columns,
   openings, room proportions, perspective and camera position.
3. Never invent additional doors, windows, balconies, rooms or structural
   elements.
4. Never hide structural uncertainty. List uncertain or risky areas.
5. Recommend slow, stable and realistic camera movement.
6. Avoid fast motion, dramatic rotations and unrealistic acceleration.
7. The final result must look like professional German real-estate marketing,
   not fantasy concept art.
8. The Kling prompt and negative prompt must be written in English.
9. Do not claim mathematical or pixel-perfect accuracy.
10. Return only the structured result requested by the schema.

KLING PROMPT REQUIREMENTS:

- describe the original room and visible architecture;
- explicitly require preservation of geometry and perspective;
- describe the intended cinematic movement;
- describe realistic light, materials and spatial continuity;
- prevent object morphing and architectural changes;
- make the prompt usable directly in an image-to-video workflow.

NEGATIVE PROMPT REQUIREMENTS:

Include protections against:
warped geometry, moving walls, altered windows, additional doors,
flickering, object morphing, disappearing furniture, duplicated objects,
unstable textures, perspective drift, fisheye distortion, excessive motion,
camera shake, unrealistic lighting and structural hallucinations.
`;

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

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing");

    return NextResponse.json(
      {
        error: "Die KI-Verbindung ist nicht konfiguriert.",
      },
      {
        status: 500,
      },
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json(
      {
        error: "Bitte melden Sie sich erneut an.",
      },
      {
        status: 401,
      },
    );
  }

  let orderWasClaimed = false;

  try {
    /*
     * Atomically claims the order.
     * Only the authenticated owner may receive a row.
     */
    const { data: claimedOrderData, error: claimError } =
      await supabase
        .rpc("claim_order_analysis", {
          p_order_id: orderId,
        })
        .single();

    if (claimError || !claimedOrderData) {
      console.warn("VimmoAI claim rejected:", {
        orderId,
        userId: authData.claims.sub,
        error: claimError?.message,
      });

      return NextResponse.json(
        {
          error:
            "Dieses Projekt wird bereits verarbeitet oder kann nicht analysiert werden.",
        },
        {
          status: 409,
        },
      );
    }

    orderWasClaimed = true;

    const order = claimedOrderData as ClaimedOrder;

    /*
     * Downloads through the signed-in Supabase client.
     * Existing Storage policies verify ownership.
     */
    const { data: imageBlob, error: downloadError } =
      await supabase.storage
        .from("original-images")
        .download(order.original_image_path);

    if (downloadError || !imageBlob) {
      throw new Error(
        downloadError?.message ??
          "The original image could not be downloaded",
      );
    }

    const mimeType = getMimeType(
      order.original_image_path,
      imageBlob.type,
    );

    const imageBuffer = Buffer.from(
      await imageBlob.arrayBuffer(),
    );

    const base64Image = imageBuffer.toString("base64");

    const userContext = `
Analyze this real-estate image for the following VimmoAI request.

Selected property type:
${order.property_type ?? "not specified"}

Selected room or area:
${order.room_type ?? "not specified"}

Requested visual style:
${order.style ?? "not specified"}

Requested duration:
${order.duration_seconds ?? "not specified"} seconds

Requested camera movement:
${order.camera_motion ?? "automatic recommendation"}

Intended use:
${order.usage_type ?? "not specified"}

Additional customer notes:
${order.notes ?? "none"}

Prepare a conservative and realistic Kling AI image-to-video prompt.
When a customer selection conflicts with the visible image or risks changing
the architecture, prioritize architectural preservation and explain the risk
inside the structured analysis.
`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.parse({
      model,

      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userContext,
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          ],
        },
      ],

      text: {
        format: zodTextFormat(
          AnalysisResultSchema,
          "vimmoai_property_analysis",
        ),
      },

      max_output_tokens: 3500,
    });

    const parsed = response.output_parsed;

    if (!parsed) {
      throw new Error(
        "OpenAI returned no structured analysis",
      );
    }

    const analysisForDatabase = {
      ...parsed.analysis,
      openai_request_id: response._request_id ?? null,
    };

    const { error: completeError } = await supabase.rpc(
      "complete_order_analysis",
      {
        p_order_id: order.id,
        p_ai_analysis: analysisForDatabase,
        p_kling_prompt: parsed.kling_prompt,
        p_negative_prompt: parsed.negative_prompt,
        p_recommended_settings:
          parsed.recommended_settings,
        p_prompt_model: model,
      },
    );

    if (completeError) {
      throw new Error(completeError.message);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: "prompt_ready",
      analysis: {
        confidenceScore:
          parsed.analysis.confidence_score,
        humanReviewRequired:
          parsed.analysis.human_review_required,
      },
    });
  } catch (error) {
    const errorMessage = getSafeErrorMessage(error);

    console.error("VimmoAI OpenAI analysis failed:", {
      orderId,
      error,
    });

    if (orderWasClaimed) {
      const { error: failError } = await supabase.rpc(
        "fail_order_analysis",
        {
          p_order_id: orderId,
          p_error: errorMessage,
        },
      );

      if (failError) {
        console.error(
          "Could not mark analysis as failed:",
          failError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Die KI-Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.",
      },
      {
        status: 500,
      },
    );
  }
}
