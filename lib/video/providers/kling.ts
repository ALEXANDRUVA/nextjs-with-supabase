import type {
  StartVideoGenerationInput,
  StartVideoGenerationResult,
  VideoProvider,
  VideoProviderTaskResult,
} from "../types";

type KlingCreateTaskResponse = {
  code?: number;
  message?: string;
  request_id?: string;
  data?: {
    task_id?: string;
    task_status?: string;
  };
};

type KlingTaskResponse = {
  code?: number;
  message?: string;
  request_id?: string;
  data?: {
    task_id?: string;
    task_status?: string;
    task_result?: {
      videos?: Array<{
        id?: string;
        url?: string;
        duration?: string;
      }>;
    };
    task_status_msg?: string;
  };
};

function getKlingConfig() {
  const apiKey = process.env.KLING_API_KEY;
  const baseUrl = process.env.KLING_API_BASE_URL;

  if (!apiKey) {
    throw new Error("KLING_API_KEY is missing");
  }

  if (!baseUrl) {
    throw new Error("KLING_API_BASE_URL is missing");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

function mapKlingStatus(
  status?: string,
):
  | "queued"
  | "processing"
  | "completed"
  | "failed" {
  switch (status?.toLowerCase()) {
    case "submitted":
    case "queued":
    case "pending":
      return "queued";

    case "processing":
    case "running":
      return "processing";

    case "succeed":
    case "success":
    case "completed":
      return "completed";

    case "failed":
    case "error":
      return "failed";

    default:
      return "queued";
  }
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body = (await response
    .json()
    .catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Kling request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  if (!body) {
    throw new Error("Kling returned an empty response");
  }

  return body;
}

export class KlingVideoProvider
  implements VideoProvider
{
  readonly name = "kling" as const;

  async startGeneration(
    input: StartVideoGenerationInput,
  ): Promise<StartVideoGenerationResult> {
    const { apiKey, baseUrl } =
      getKlingConfig();

    const response = await fetch(
      `${baseUrl}/v1/videos/image2video`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          image: input.imageUrl,
          prompt: input.prompt,
          negative_prompt:
            input.negativePrompt ?? "",
          duration: String(
            input.durationSeconds,
          ),
          aspect_ratio: input.aspectRatio,
          mode:
            input.mode === "professional"
              ? "pro"
              : "std",
          ...(input.model
            ? {
                model_name: input.model,
              }
            : {}),
        }),

        cache: "no-store",
      },
    );

    const result =
      await parseResponse<KlingCreateTaskResponse>(
        response,
      );

    if (
      result.code !== undefined &&
      result.code !== 0
    ) {
      throw new Error(
        result.message ??
          `Kling returned error code ${result.code}`,
      );
    }

    const externalTaskId =
      result.data?.task_id;

    if (!externalTaskId) {
      throw new Error(
        "Kling returned no task ID",
      );
    }

    return {
      provider: this.name,
      externalTaskId,
      status: mapKlingStatus(
        result.data?.task_status,
      ),
      requestId:
        result.request_id ?? null,
      rawStatus:
        result.data?.task_status ?? null,
    };
  }

  async getTask(
    externalTaskId: string,
  ): Promise<VideoProviderTaskResult> {
    const { apiKey, baseUrl } =
      getKlingConfig();

    const response = await fetch(
      `${baseUrl}/v1/videos/image2video/${encodeURIComponent(
        externalTaskId,
      )}`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${apiKey}`,
        },

        cache: "no-store",
      },
    );

    const result =
      await parseResponse<KlingTaskResponse>(
        response,
      );

    if (
      result.code !== undefined &&
      result.code !== 0
    ) {
      throw new Error(
        result.message ??
          `Kling returned error code ${result.code}`,
      );
    }

    const rawStatus =
      result.data?.task_status;

    const status =
      mapKlingStatus(rawStatus);

    const firstVideo =
      result.data?.task_result
        ?.videos?.[0];

    return {
      provider: this.name,
      externalTaskId,
      status,
      videoUrl:
        firstVideo?.url ?? null,
      thumbnailUrl: null,
      errorMessage:
        status === "failed"
          ? result.data
              ?.task_status_msg ??
            result.message ??
            "Kling video generation failed"
          : null,
      rawStatus: rawStatus ?? null,
    };
  }
}
