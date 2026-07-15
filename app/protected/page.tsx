/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { AnalyzeProjectButton } from "./analyze-project-button";

type ProjectRow = {
  id: string;
  user_id: string;
  status: string;
  property_type: string | null;
  room_type: string | null;
  style: string | null;
  duration_seconds: number | null;
  original_image_path: string | null;
  created_at: string;
};

type ProjectWithImage = ProjectRow & {
  imageUrl: string | null;
};

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  image_uploaded: "Anfrage eingegangen",
  payment_pending: "Zahlung ausstehend",
  paid: "Zahlung bestätigt",
  prompt_processing: "Projekt wird vorbereitet",
  prompt_ready: "Vorbereitung abgeschlossen",
  video_queued: "Produktion eingeplant",
  video_processing: "Video wird erstellt",
  quality_review: "Qualitätsprüfung",
  approved: "Video freigegeben",
  delivered: "Fertiggestellt",
  failed: "Interne Prüfung erforderlich",
  refunded: "Erstattet",
};

const propertyLabels: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  neubau: "Neubau",
  gewerbe: "Gewerbeimmobilie",
};

const roomLabels: Record<string, string> = {
  wohnzimmer: "Wohnzimmer",
  schlafzimmer: "Schlafzimmer",
  kueche: "Küche",
  badezimmer: "Badezimmer",
  aussenbereich: "Außenbereich",
  gesamte_immobilie: "Gesamte Immobilie",
};

const styleLabels: Record<string, string> = {
  modern: "Modern",
  warm_minimalism: "Warm Minimalism",
  japandi: "Japandi",
  scandinavian: "Skandinavisch",
  modern_luxury: "Modern Luxury",
  architecture_preserved: "Originalarchitektur",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  if (status === "failed") {
    return "border-red-400/25 bg-red-400/10 text-red-200";
  }

  if (status === "refunded") {
    return "border-white/15 bg-white/[0.06] text-white/60";
  }

  if (status === "approved" || status === "delivered") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status === "video_processing" ||
    status === "quality_review"
  ) {
    return "border-blue-400/25 bg-blue-400/10 text-blue-200";
  }

  return "border-[#d6b25e]/30 bg-[#d6b25e]/15 text-[#ead28f]";
}

async function ProtectedDashboardContent() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/auth/login");
  }

  const userId = String(authData.claims.sub);

  const { data: projectData, error: projectError } =
    await supabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          status,
          property_type,
          room_type,
          style,
          duration_seconds,
          original_image_path,
          created_at
        `,
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

  if (projectError) {
    console.error("Could not load projects:", projectError);
  }

  const projects: ProjectWithImage[] = await Promise.all(
    ((projectData ?? []) as ProjectRow[]).map(
      async (project) => {
        let imageUrl: string | null = null;

        if (project.original_image_path) {
          const { data, error } = await supabase.storage
            .from("original-images")
            .createSignedUrl(
              project.original_image_path,
              3600,
            );

          if (error) {
            console.error(
              "Could not create project image URL:",
              error,
            );
          }

          imageUrl = data?.signedUrl ?? null;
        }

        return {
          ...project,
          imageUrl,
        };
      },
    ),
  );

  const completedStatuses = new Set([
    "approved",
    "delivered",
  ]);

  const completedCount = projects.filter((project) =>
    completedStatuses.has(project.status),
  ).length;

  const inProgressCount = projects.filter(
    (project) =>
      !completedStatuses.has(project.status) &&
      project.status !== "refunded",
  ).length;

  return (
    <section className="w-full py-2">
      <header className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c474] shadow-[0_0_12px_rgba(226,196,116,0.8)]" />

            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c474]">
              VimmoAI Dashboard
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Meine Projekte
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/45">
            Verwalten Sie Ihre Immobilienvisualisierungen und
            verfolgen Sie den aktuellen Bearbeitungsstatus.
          </p>
        </div>

        <Link
          href="/protected/new-order"
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-xl bg-[#d6b25e] px-6 py-3 font-semibold text-black shadow-[0_14px_45px_rgba(214,178,94,0.15)] transition hover:-translate-y-0.5 hover:bg-[#e2c474]"
        >
          + Neue Anfrage
        </Link>
      </header>

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Projekte insgesamt"
          value={projects.length}
        />

        <StatCard
          label="In Bearbeitung"
          value={inProgressCount}
        />

        <StatCard
          label="Fertiggestellt"
          value={completedCount}
        />
      </div>

      {projects.length === 0 ? (
        <article className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <h2 className="text-2xl font-semibold text-white">
            Noch keine Projekte
          </h2>

          <p className="mx-auto mt-3 max-w-xl leading-7 text-white/45">
            Erstellen Sie Ihre erste Anfrage und laden Sie ein
            Objektfoto für die Bearbeitung hoch.
          </p>

          <Link
            href="/protected/new-order"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d6b25e] px-6 py-3 font-semibold text-black transition hover:bg-[#e2c474]"
          >
            Erste Anfrage erstellen
          </Link>
        </article>
      ) : (
        <div className="mt-8 grid items-start gap-7 lg:grid-cols-2">
          {projects.map((project) => {
            const propertyLabel =
              propertyLabels[project.property_type ?? ""] ??
              project.property_type ??
              "Immobilienprojekt";

            const roomLabel =
              roomLabels[project.room_type ?? ""] ??
              project.room_type ??
              "Objektbereich";

            const styleLabel =
              styleLabels[project.style ?? ""] ??
              project.style ??
              "—";

            return (
              <article
                key={project.id}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

                <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
                  {project.imageUrl ? (
                    <img
                      src={project.imageUrl}
                      alt={`${propertyLabel} – ${roomLabel}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/35">
                      Kein Objektfoto verfügbar
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-xl ${getStatusClasses(
                        project.status,
                      )}`}
                    >
                      {statusLabels[project.status] ??
                        project.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {propertyLabel} · {roomLabel}
                      </h2>

                      <p className="mt-2 text-sm text-white/40">
                        Erstellt am{" "}
                        {formatDate(project.created_at)}
                      </p>
                    </div>

                    <span className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 font-mono text-[10px] text-white/35">
                      {project.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <InfoCard
                      label="Stil"
                      value={styleLabel}
                    />

                    <InfoCard
                      label="Videolänge"
                      value={
                        project.duration_seconds
                          ? `${project.duration_seconds} Sekunden`
                          : "—"
                      }
                    />
                  </div>

                  <div className="mt-5">
                    <AnalyzeProjectButton
                      orderId={project.id}
                      status={project.status}
                    />
                  </div>

                  <Link
                    href={`/protected/projects/${project.id}`}
                    className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d6b25e]/35 bg-[#d6b25e]/10 px-5 py-3 font-semibold text-[#ead28f] transition hover:-translate-y-0.5 hover:border-[#d6b25e]/60 hover:bg-[#d6b25e]/15"
                  >
                    Projekt ansehen
                    <span aria-hidden="true">→</span>
                  </Link>

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="text-xs leading-5 text-white/30">
                      Ihre Anfrage wurde sicher gespeichert. Wir
                      informieren Sie über den weiteren
                      Projektfortschritt.
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DashboardLoading() {
  return (
    <section className="w-full py-2">
      <div className="h-9 w-48 animate-pulse rounded-full bg-white/10" />

      <div className="mt-5 h-14 w-80 max-w-full animate-pulse rounded-xl bg-white/10" />

      <div className="mt-4 h-7 w-[520px] max-w-full animate-pulse rounded-lg bg-white/[0.06]" />

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />

        <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />

        <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
      </div>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-2">
        <div className="h-[650px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <p className="text-sm text-white/35">{label}</p>

      <p className="mt-3 text-3xl font-bold text-[#ead28f]">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-white/30">{label}</p>

      <p className="mt-1.5 break-words font-medium text-white/80">
        {value}
      </p>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ProtectedDashboardContent />
    </Suspense>
  );
}
