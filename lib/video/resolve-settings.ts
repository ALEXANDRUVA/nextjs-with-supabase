import type {
  Json,
} from "@/lib/supabase/database.types";

import type {
  VideoAspectRatio,
  VideoDurationSeconds,
  VideoGenerationMode,
} from "./types";

type JsonObject = {
  [key: string]: Json | undefined;
};

export type ResolvedVideoGenerationSettings = {
  durationSeconds: VideoDurationSeconds;
  aspectRatio: VideoAspectRatio;
  mode: VideoGenerationMode;
  model: string | null;
};

type ResolveVideoGenerationSettingsInput = {
  durationSeconds: number | null;
  recommendedSettings: Json | null;
  providerConfiguration: Json;
  defaultModel: string | null;
};

function isJsonObject(
  value: Json | null,
): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getStringValue(
  object: JsonObject,
  key: string,
): string | null {
  const value = object[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

function getNumberValue(
  object: JsonObject,
  key: string,
): number | null {
  const value = object[key];

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    const parsedValue = Number(
      value.trim(),
    );

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function parseDuration(
  value: number | null,
): VideoDurationSeconds | null {
  if (value === 5 || value === 10) {
    return value;
  }

  return null;
}

function parseAspectRatio(
  value: string | null,
): VideoAspectRatio {
  const normalizedValue =
    value?.trim().toLowerCase() ?? "";

  /*
   * Check 9:16 before 16:9 so that partial
   * text comparisons can never be ambiguous.
   */
  if (normalizedValue.includes("9:16")) {
    return "9:16";
  }

  if (normalizedValue.includes("1:1")) {
    return "1:1";
  }

  if (normalizedValue.includes("16:9")) {
    return "16:9";
  }

  /*
   * VimmoAI website and real-estate
   * presentations use landscape by default.
   */
  return "16:9";
}

function parseGenerationMode(
  value: string | null,
): VideoGenerationMode {
  const normalizedValue =
    value?.trim().toLowerCase() ?? "";

  if (
    normalizedValue === "professional" ||
    normalizedValue === "pro"
  ) {
    return "professional";
  }

  return "standard";
}

function parseModel(
  value: string | null,
): string | null {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

export function resolveVideoGenerationSettings(
  input: ResolveVideoGenerationSettingsInput,
): ResolvedVideoGenerationSettings {
  const recommendedSettings =
    isJsonObject(
      input.recommendedSettings,
    )
      ? input.recommendedSettings
      : {};

  const providerConfiguration =
    isJsonObject(
      input.providerConfiguration,
    )
      ? input.providerConfiguration
      : {};

  const recommendedDuration =
    getNumberValue(
      recommendedSettings,
      "duration_seconds",
    );

  const durationSeconds =
    parseDuration(
      input.durationSeconds,
    ) ??
    parseDuration(
      recommendedDuration,
    );

  if (!durationSeconds) {
    throw new Error(
      "UNSUPPORTED_VIDEO_DURATION",
    );
  }

  const aspectRatioText =
    getStringValue(
      recommendedSettings,
      "aspect_ratio",
    ) ??
    getStringValue(
      recommendedSettings,
      "aspect_ratio_recommendation",
    );

  const providerMode =
    getStringValue(
      providerConfiguration,
      "generation_mode",
    );

  return {
    durationSeconds,

    aspectRatio:
      parseAspectRatio(
        aspectRatioText,
      ),

    mode:
      parseGenerationMode(
        providerMode,
      ),

    model:
      parseModel(
        input.defaultModel,
      ),
  };
}
