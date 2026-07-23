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

type ActiveProviderRow = {
  provider_key: string;
  display_name: string;
  priority: number;
  default_model: string | null;
  configuration: Json;
};

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

  const row = Array.isArray(data)
    ? (data[0] as ActiveProviderRow | undefined)
    : undefined;

  if (!row) {
    throw new Error(
      "No active image-to-video provider is configured",
    );
  }

  if (!hasRegisteredVideoProvider(row.provider_key)) {
    throw new Error(
      `Active provider "${row.provider_key}" is not registered in the application`,
    );
  }

  return {
    provider: getRegisteredVideoProvider(row.provider_key),
    providerName: row.provider_key,
    displayName: row.display_name,
    priority: row.priority,
    defaultModel: row.default_model,
    configuration: isConfigurationObject(row.configuration)
      ? row.configuration
      : {},
  };
}
Bibliothek
/
selector.ts


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

type ActiveProviderRow = {
  provider_key: string;
  display_name: string;
  priority: number;
  default_model: string | null;
  configuration: Json;
};

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

  const row = Array.isArray(data)
    ? (data[0] as ActiveProviderRow | undefined)
    : undefined;

  if (!row) {
    throw new Error(
      "No active image-to-video provider is configured",
    );
  }

  if (!hasRegisteredVideoProvider(row.provider_key)) {
    throw new Error(
      `Active provider "${row.provider_key}" is not registered in the application`,
    );
  }

  return {
    provider: getRegisteredVideoProvider(row.provider_key),
    providerName: row.provider_key,
    displayName: row.display_name,
    priority: row.priority,
    defaultModel: row.default_model,
    configuration: isConfigurationObject(row.configuration)
      ? row.configuration
      : {},
  };
}
