"use client";

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AnalyzeProjectButtonProps = {
  orderId: string;
  status: string;
};

type AnalyzeApiResponse = {
  success?: boolean;
  error?: string;
};

export function AnalyzeProjectButton({
  orderId,
  status,
}: AnalyzeProjectButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isProcessing = status === "prompt_processing";
  const isReady = status === "prompt_ready";

  const canAnalyze =
    status === "image_uploaded" || status === "failed";

  async function handleAnalyze() {
    if (isLoading || !canAnalyze) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/analyze`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as AnalyzeApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Die KI-Analyse konnte nicht gestartet werden.",
        );
      }

      setSuccessMessage(
        "Die Analyse wurde erfolgreich abgeschlossen.",
      );

      /*
       * Re-fetch the Server Component dashboard.
       * The refreshed project should now have:
       * status = prompt_ready
       */
      router.refresh();
    } catch (error) {
      console.error("VimmoAI analysis button error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ein unerwarteter Fehler ist aufgetreten.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isReady) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10">
          <CheckCircle2
            className="h-5 w-5 text-emerald-300"
            aria-hidden="true"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-emerald-200">
            Prompt vorbereitet
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-100/60">
            Die Bildanalyse und der Kling-Prompt wurden
            erfolgreich gespeichert.
          </p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <button
        type="button"
        disabled
        className="mt-6 flex min-h-14 w-full cursor-wait items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-5 py-3 font-semibold text-blue-200"
      >
        <LoaderCircle
          className="h-5 w-5 animate-spin"
          aria-hidden="true"
        />

        KI-Analyse läuft...
      </button>
    );
  }

  if (!canAnalyze) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isLoading}
        className="group relative flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#e2c474]/35 bg-gradient-to-r from-[#d6b25e] via-[#e2c474] to-[#a9873e] px-5 py-3 font-semibold text-black shadow-[0_16px_50px_rgba(214,178,94,0.18)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />

        {isLoading ? (
          <>
            <LoaderCircle
              className="relative h-5 w-5 animate-spin"
              aria-hidden="true"
            />

            <span className="relative">
              Bild wird analysiert...
            </span>
          </>
        ) : status === "failed" ? (
          <>
            <RotateCcw
              className="relative h-5 w-5"
              aria-hidden="true"
            />

            <span className="relative">
              KI-Analyse erneut starten
            </span>
          </>
        ) : (
          <>
            <Sparkles
              className="relative h-5 w-5"
              aria-hidden="true"
            />

            <span className="relative">
              Mit KI analysieren
            </span>
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-white/35">
        OpenAI analysiert das Objektfoto und erstellt einen
        professionellen Kling-AI-Prompt. Das Video wird dabei
        noch nicht generiert.
      </p>

      {successMessage ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />

          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />

          <span>{errorMessage}</span>
        </div>
      ) : null}
    </div>
  );
}
