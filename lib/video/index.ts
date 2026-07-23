export {
  getRegisteredVideoProvider,
  hasRegisteredVideoProvider,
} from "./registry";

export {
  selectActiveVideoProvider,
  type SelectedVideoProvider,
} from "./selector";

export { videoService } from "./service";

export { KlingVideoProvider } from "./providers/kling";

export type {
  StartVideoGenerationInput,
  StartVideoGenerationResult,
  VideoAspectRatio,
  VideoDurationSeconds,
  VideoGenerationMode,
  VideoJobStatus,
  VideoProvider,
  VideoProviderName,
  VideoProviderTaskResult,
} from "./types";
