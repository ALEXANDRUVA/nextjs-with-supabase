import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import {
  getRegisteredVideoProvider,
  hasRegisteredVideoProvider,
} from "./registry";

import type {
  VideoProvider,
  VideoProviderName,
} from "./types";

export type SelectedVideoProvider = {
  provider: VideoProvider;
  providerName: VideoProviderName;
  displayName: string;
  priority: number;
  defaultModel: string | null;
  configuration: Record<string, unknown>;
};

function isConfigurationObject(
  value: Json,
): value is { [key: string]: Json | undefined } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function selectActiveVideoProvider(): Promise<SelectedVideoProvider> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_active_video_provider",
  );

  if (error) {
    throw new Error(
      `Could not load active video provider: ${error.message}`,
    );
  }

  const row = data?.[0];

  if (!row) {
    throw new Error(
      "No active image-to-video provider is configured",
    );
  }

  const providerName = row.provider_key;

  if (!hasRegisteredVideoProvider(providerName)) {
    throw new Error(
      `Active provider "${providerName}" is not registered in the application`,
    );
  }

  return {
    provider: getRegisteredVideoProvider(providerName),
    providerName,
    displayName: row.display_name,
    priority: row.priority,
    defaultModel: row.default_model ?? null,
    configuration: isConfigurationObject(
      row.configuration,
    )
      ? row.configuration
      : {},
  };
}
