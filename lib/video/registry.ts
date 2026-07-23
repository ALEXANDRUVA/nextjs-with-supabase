import { KlingVideoProvider } from "./providers/kling";
import type {
  VideoProvider,
  VideoProviderName,
} from "./types";

const providers: Record<
  VideoProviderName,
  VideoProvider
> = {
  kling: new KlingVideoProvider(),
};

export function getRegisteredVideoProvider(
  name: VideoProviderName,
): VideoProvider {
  const provider = providers[name];

  if (!provider) {
    throw new Error(
      `Video provider "${name}" is not registered`,
    );
  }

  return provider;
}

export function hasRegisteredVideoProvider(
  name: string,
): name is VideoProviderName {
  return Object.prototype.hasOwnProperty.call(
    providers,
    name,
  );
}
