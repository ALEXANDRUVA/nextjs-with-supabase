export type VideoProviderName = "kling";

export type VideoJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type VideoAspectRatio =
  | "16:9"
  | "9:16"
  | "1:1";

export type VideoDurationSeconds =
  | 5
  | 10;

export type VideoGenerationMode =
  | "standard"
  | "professional";

export type StartVideoGenerationInput = {
  orderId: string;

  imageUrl: string;

  prompt: string;

  negativePrompt?: string | null;

  durationSeconds: VideoDurationSeconds;

  aspectRatio: VideoAspectRatio;

  mode: VideoGenerationMode;

  model?: string | null;
};

export type StartVideoGenerationResult = {
  provider: VideoProviderName;

  externalTaskId: string;

  status: VideoJobStatus;

  requestId?: string | null;

  rawStatus?: string | null;
};

export type VideoProviderTaskResult = {
  provider: VideoProviderName;

  externalTaskId: string;

  status: VideoJobStatus;

  videoUrl?: string | null;

  thumbnailUrl?: string | null;

  errorMessage?: string | null;

  rawStatus?: string | null;
};

export interface VideoProvider {
  readonly name: VideoProviderName;

  startGeneration(
    input: StartVideoGenerationInput,
  ): Promise<StartVideoGenerationResult>;

  getTask(
    externalTaskId: string,
  ): Promise<VideoProviderTaskResult>;
}
