"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyTextButtonProps = {
  text: string;
  label: string;
  copiedLabel?: string;
};

export function CopyTextButton({
  text,
  label,
  copiedLabel = "Kopiert",
}: CopyTextButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleCopy() {
    if (!text) {
      return;
    }

    setHasError(false);

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);

      window.setTimeout(() => {
        setIsCopied(false);
      }, 2200);
    } catch (error) {
      console.error("Copy failed:", error);
      setHasError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!text}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d6b25e]/30 bg-[#d6b25e]/10 px-4 py-2.5 text-sm font-semibold text-[#ead28f] transition hover:border-[#d6b25e]/55 hover:bg-[#d6b25e]/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCopied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}

        {isCopied ? copiedLabel : label}
      </button>

      {hasError ? (
        <p className="mt-2 text-xs text-red-300">
          Der Text konnte nicht kopiert werden. Bitte markieren Sie ihn
          manuell.
        </p>
      ) : null}
    </div>
  );
}
