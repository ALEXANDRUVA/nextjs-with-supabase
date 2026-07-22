import Link from "next/link";

const technologies = [
  "Next.js",
  "TypeScript",
  "Supabase",
  "PostgreSQL",
  "OpenAI API",
  "Kling API – deaktiviert",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-[#d6b25e]/10 blur-[140px]" />
        <div className="absolute bottom-[-280px] right-[-180px] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <nav className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b25e]/30 bg-[#d6b25e]/10 text-lg font-bold text-[#e5c878]">
              V
            </div>

            <div>
              <p className="font-semibold tracking-wide">VimmoAI</p>
              <p className="text-xs text-white/35">
                KI-Immobilienvisualisierung
              </p>
            </div>
          </Link>

          <Link
            href="/auth/login"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold transition hover:border-white/25 hover:bg-white/[0.08]"
          >
            Anmelden
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-7xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/25 bg-[#d6b25e]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c878]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e5c878] shadow-[0_0_12px_rgba(229,200,120,0.9)]" />
          Produkt in Entwicklung
        </div>

        <h1 className="mt-8 max-w-5xl text-5xl font-bold leading-[1.06] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          Vom Objektfoto zur cinematischen Immobilienpräsentation
        </h1>

        <p className="mt-7 max-w-3xl text-base leading-8 text-white/50 sm:text-lg">
          VimmoAI organisiert Immobilienfotos und Projektangaben sicher und
          bereitet daraus klare, produktionsreife Konzepte für hochwertige
          Immobilienvideos vor.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col justify-center gap-4 sm:max-w-none sm:flex-row">
          <Link
            href="/protected"
            className="inline-flex min-h-13 items-center justify-center rounded-xl bg-[#d6b25e] px-7 py-3.5 font-semibold text-black shadow-[0_18px_55px_rgba(214,178,94,0.18)] transition hover:-translate-y-0.5 hover:bg-[#e5c878]"
          >
            VimmoAI Dashboard öffnen
          </Link>

          <a
            href="#workflow"
            className="inline-flex min-h-13 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 font-semibold transition hover:border-white/25 hover:bg-white/[0.08]"
          >
            Ablauf ansehen
          </a>
        </div>

        <div
          id="workflow"
          className="mt-20 grid w-full gap-5 text-left md:grid-cols-3"
        >
          <FeatureCard
            number="01"
            title="Projekt erstellen"
            description="Objektdaten erfassen, Stil auswählen und die gewünschte Präsentationsrichtung festlegen."
          />

          <FeatureCard
            number="02"
            title="Objektfoto hochladen"
            description="Bilder geschützt speichern und jede Visualisierungsanfrage zentral im Dashboard verwalten."
          />

          <FeatureCard
            number="03"
            title="Konzept prüfen"
            description="Die Anfrage wird strukturiert vorbereitet. Kostenpflichtige Videogenerierung startet niemals automatisch."
          />
        </div>

        <div className="mt-14 flex max-w-4xl flex-wrap justify-center gap-2">
          {technologies.map((technology) => (
            <span
              key={technology}
              className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-white/45"
            >
              {technology}
            </span>
          ))}
        </div>

        <div className="mt-16 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-left backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b25e]">
            Aktueller Stand
          </p>

          <p className="mt-3 leading-7 text-white/50">
            Authentifizierung, Projekterstellung, sicherer Bild-Upload und
            Projektverwaltung sind vorhanden. Die automatische Kling-
            Videogenerierung, Zahlung und Auslieferung sind noch deaktiviert
            und werden erst nach vollständigen Sicherheitstests freigeschaltet.
          </p>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/30">
          VimmoAI 2026 · Sichere Immobilienvisualisierung in Entwicklung
        </footer>
      </section>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

      <p className="text-xs font-bold tracking-[0.2em] text-[#d6b25e]">
        {number}
      </p>

      <h2 className="mt-5 text-xl font-semibold">{title}</h2>

      <p className="mt-3 leading-7 text-white/45">{description}</p>
    </article>
  );
}
