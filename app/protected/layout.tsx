import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Premium background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(214,178,94,0.18), transparent 30%), radial-gradient(circle at 88% 18%, rgba(58,105,255,0.14), transparent 28%), radial-gradient(circle at 50% 90%, rgba(214,178,94,0.08), transparent 35%), linear-gradient(180deg, #050505 0%, #0b0b0d 48%, #050505 100%)",
        }}
      />

      {/* Grid discret */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow-uri premium */}
      <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-[#d6b25e]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/45 backdrop-blur-2xl">
          <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5">
            <Link href="/protected" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b25e]/30 bg-[#d6b25e]/10 shadow-[0_0_30px_rgba(214,178,94,0.12)]">
                <span className="text-lg font-bold text-[#e2c474]">V</span>
              </div>

              <div>
                <p className="text-base font-semibold tracking-wide">
                  VimmoAI
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  Immobilienvisualisierung
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/protected/new-order"
                className="hidden rounded-xl border border-[#d6b25e]/25 bg-[#d6b25e]/10 px-4 py-2 font-medium text-[#e2c474] transition hover:border-[#d6b25e]/50 hover:bg-[#d6b25e]/15 sm:inline-flex"
              >
                Neue Anfrage
              </Link>

              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
          {children}
        </div>

        <footer className="border-t border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-center text-xs text-white/40 sm:flex-row">
            <p>© 2026 VimmoAI</p>
            <p>KI-gestützte Immobilienvisualisierung</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
