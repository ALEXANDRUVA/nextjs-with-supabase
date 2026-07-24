import { KlingVideoProvider } from "./providers/kling";
import type {
  StartVideoGenerationInput,
  StartVideoGenerationResult,
  VideoProvider,
  VideoProviderTaskResult,
} from "./types";

class VideoService {
  private readonly providers: Record<string, VideoProvider>;

  constructor() {
    this.providers = {
      kling: new KlingVideoProvider(),
    };
  }

  getProvider(name = "kling"): VideoProvider {
    const provider = this.providers[name];

    if (!provider) {
      throw new Error(`Unknown video provider: ${name}`);
    }

    return provider;
  }

  async startGeneration(
    input: StartVideoGenerationInput,
  ): Promise<StartVideoGenerationResult> {
    return this.getProvider().startGeneration(input);
  }

  async getTask(
    taskId: string,
  ): Promise<VideoProviderTaskResult> {
    return this.getProvider().getTask(taskId);
  }
}

export const videoService = new VideoService();
