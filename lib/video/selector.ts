import { createClient } from "@/lib/supabase/server";

import {
  getRegisteredVideoProvider,
  hasRegisteredVideoProvider,
} from "./registry";
import type {
  VideoProvider,
  VideoProviderName,
} from "./types";

type ActiveProviderRow = {
  provider_key: string;
  display_name: string;
  priority: number;
  default_model: string | null;
  configuration: Record<string, unknown> | null;
};

export type SelectedVideoProvider = {
  provider: VideoProvider;
  providerName: VideoProviderName;
  displayName: string;
  priority: number;
  defaultModel: string | null;
  configuration: Record<string, unknown>;
};

export async function selectActiveVideoProvider():
  Promise<SelectedVideoProvider> {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("video_providers")
    .select(
      `
        provider_key,
        display_name,
        priority,
        default_model,
        configuration
      `,
    )
    .eq("enabled", true)
    .eq("supports_image_to_video", true)
    .order("priority", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load active video provider: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "No active image-to-video provider is configured",
    );
  }

  const row = data as ActiveProviderRow;

  if (
    !hasRegisteredVideoProvider(
      row.provider_key,
    )
  ) {
    throw new Error(
      `Active provider "${row.provider_key}" is not registered in the application`,
    );
  }

  return {
    provider: getRegisteredVideoProvider(
      row.provider_key,
    ),
    providerName: row.provider_key,
    displayName: row.display_name,
    priority: row.priority,
    defaultModel:
      row.default_model ?? null,
    configuration:
      row.configuration ?? {},
  };
}
