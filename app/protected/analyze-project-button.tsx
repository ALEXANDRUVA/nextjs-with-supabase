"use client";

import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AnalyzeProjectButtonProps = {
  orderId: string;
  status: string;
};

const completedPreparationStatuses = [
  "prompt_ready",
  "video_queued",
  "video_processing",
  "quality_review",
  "approved",
  "delivered",
];

export function AnalyzeProjectButton({
  orderId,
  status,
}: AnalyzeProjectButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [wasStarted, setWasStarted] = useState(false);

  async function handlePreparation() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    setWasStarted(false);

    try {
      const response = await fetch(
        `/api/orders/${orderId}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result?.error === "string"
            ? result.error
            : typeof result?.message === "string"
              ? result.message
              : "Die Vorbereitung konnte nicht abgeschlossen werden.";

        throw new Error(message);
      }

      setWasStarted(true);
      router.refresh();
    } catch (error) {
      console.error("Project preparation failed:", error);

      setLocalError(
        error instanceof Error
          ? error.message
          : "Die Vorbereitung konnte nicht abgeschlossen werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (completedPreparationStatuses.includes(status)) {
    if (status !== "prompt_ready") {
      return null;
    }

    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10">
            <CheckCircle2
              className="h-5 w-5 text-emerald-300"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="font-semibold text-emerald-200">
              Vorbereitung abgeschlossen
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-100/60">
              Die interne Vorbereitung wurde erfolgreich
              abgeschlossen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "prompt_processing") {
    return (
      <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-400/10">
            <LoaderCircle
              className="h-5 w-5 animate-spin text-blue-200"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="font-semibold text-blue-100">
              Projekt wird vorbereitet
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-100/55">
              Die interne Vorbereitung läuft. Bitte warten Sie einen
              Moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canStartPreparation = [
    "image_uploaded",
    "paid",
    "failed",
  ].includes(status);

  if (!canStartPreparation) {
    return null;
  }

  const isRetry = status === "failed";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="font-semibold text-white/85">
        {isRetry
          ? "Interne Prüfung erforderlich"
          : "Projektvorbereitung"}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/45">
        Das Objektfoto wird intern geprüft und für die professionelle
        Videoproduktion vorbereitet.
      </p>

      {wasStarted ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Die Vorbereitung wurde gestartet.
        </div>
      ) : null}

      {localError ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3">
          <p className="text-sm leading-6 text-red-200">
            Die Vorbereitung konnte nicht abgeschlossen werden.
          </p>

          <p className="mt-1 text-xs leading-5 text-red-200/55">
            Das Projekt kann später erneut gestartet werden.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handlePreparation}
        disabled={isLoading}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b25e] px-5 py-3 font-semibold text-black transition hover:bg-[#e2c474] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <LoaderCircle
              className="h-5 w-5 animate-spin"
              aria-hidden="true"
            />
            Projekt wird vorbereitet...
          </>
        ) : isRetry ? (
          <>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Vorbereitung erneut starten
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            Projekt vorbereiten
          </>
        )}
      </button>
    </div>
  );
}
