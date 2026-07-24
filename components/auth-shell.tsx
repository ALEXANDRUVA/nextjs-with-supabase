import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#050505] px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, rgba(214,178,94,0.17), transparent 32%), radial-gradient(circle at 88% 82%, rgba(58,105,255,0.12), transparent 30%), linear-gradient(180deg, #050505 0%, #0b0b0d 52%, #050505 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6b25e]/30 bg-[#d6b25e]/10 text-lg font-bold text-[#e2c474]">
            V
          </span>

          <span>
            <span className="block font-semibold tracking-wide">
              VimmoAI
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">
              Immobilienvisualisierung
            </span>
          </span>
        </Link>

        {children}

        <p className="mt-6 text-center text-xs leading-5 text-white/35">
          Sichere Anmeldung über Supabase. Die automatische
          Videogenerierung ist während der Entwicklung deaktiviert.
        </p>
      </div>
    </main>
  );
}
