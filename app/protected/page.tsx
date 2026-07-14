/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { AnalyzeProjectButton } from "./analyze-project-button";

type OrderRow = {
  id: string;
  status: string;
  property_type: string | null;
  room_type: string | null;
  style: string | null;
  duration_seconds: number | null;
  camera_motion: string | null;
  usage_type: string | null;
  notes: string | null;
  original_image_path: string | null;
  approved_video_path: string | null;
  generation_attempts: number;
  created_at: string;
};

type ProjectWithImage = OrderRow & {
  imageUrl: string | null;
};

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  image_uploaded: "Bild hochgeladen",
  payment_pending: "Zahlung ausstehend",
  paid: "Bezahlt",
  prompt_processing: "KI-Analyse läuft",
  prompt_ready: "Prompt vorbereitet",
  video_queued: "In Warteschlange",
  video_processing: "Video wird erstellt",
  quality_review: "Qualitätsprüfung",
  approved: "Freigegeben",
  delivered: "Ausgeliefert",
  failed: "Fehlgeschlagen",
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
  scandinavian: "Scandinavian",
  modern_luxury: "Modern Luxury",
  architecture_preserved: "Originalarchitektur",
};

function getStatusClasses(status: string) {
  if (status === "failed" || status === "refunded") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  if (status === "approved" || status === "delivered") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status === "video_processing" ||
    status === "prompt_processing" ||
    status === "quality_review"
  ) {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }

  return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#ead28f]";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

async function DashboardContent() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/auth/login");
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
        id,
        status,
        property_type,
        room_type,
        style,
        duration_seconds,
        camera_motion,
        usage_type,
        notes,
        original_image_path,
        approved_video_path,
        generation_attempts,
        created_at
      `,
    )
    .order("created_at", { ascending: false });

  if (ordersError) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-200">
        Die Projekte konnten nicht geladen werden.
        <p className="mt-2 text-sm text-red-200/70">
          {ordersError.message}
        </p>
      </div>
    );
  }

  const orders = (ordersData ?? []) as OrderRow[];

  const projects: ProjectWithImage[] = await Promise.all(
    orders.map(async (order) => {
      if (!order.original_image_path) {
        return {
          ...order,
          imageUrl: null,
        };
      }

      const { data } = await supabase.storage
        .from("original-images")
        .createSignedUrl(order.original_image_path, 3600);

      return {
        ...order,
        imageUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <section className="w-full py-4">
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c474] shadow-[0_0_12px_rgba(226,196,116,0.8)]" />

            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c474]">
              VimmoAI Dashboard
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            Meine Projekte
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/50">
            Verwalten Sie Ihre Immobilienvisualisierungen und verfolgen Sie
            den aktuellen Bearbeitungsstatus.
          </p>
        </div>

        <Link
          href="/protected/new-order"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d6b25e]/35 bg-gradient-to-r from-[#d6b25e] to-[#a9873e] px-6 py-3 font-semibold text-black shadow-[0_15px_45px_rgba(214,178,94,0.18)] transition hover:scale-[1.02] hover:brightness-110"
        >
          + Neue Anfrage
        </Link>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Projekte insgesamt"
          value={projects.length}
        />

        <StatCard
          label="In Bearbeitung"
          value={
            projects.filter((project) =>
              [
                "image_uploaded",
                "prompt_processing",
                "prompt_ready",
                "video_queued",
                "video_processing",
                "quality_review",
              ].includes(project.status),
            ).length
          }
        />

        <StatCard
          label="Fertiggestellt"
          value={
            projects.filter((project) =>
              ["approved", "delivered"].includes(project.status),
            ).length
          }
        />
      </div>

      {projects.length === 0 ? (
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d6b25e]/25 bg-[#d6b25e]/10 text-2xl text-[#e2c474]">
            V
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-white">
            Noch keine Projekte vorhanden
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-white/50">
            Erstellen Sie Ihre erste KI-gestützte Immobilienvisualisierung.
          </p>

          <Link
            href="/protected/new-order"
            className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-[#ead28f]"
          >
            Erste Anfrage erstellen
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#d6b25e]/25"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/50 to-transparent" />

              <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
                {project.imageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt="Immobilienfoto des Projekts"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/35">
                    Kein Vorschaubild
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <span
                  className={`absolute bottom-4 left-4 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                    project.status,
                  )}`}
                >
                  {statusLabels[project.status] ?? project.status}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {propertyLabels[project.property_type ?? ""] ??
                        "Immobilienprojekt"}
                      {" · "}
                      {roomLabels[project.room_type ?? ""] ??
                        "Objektbereich"}
                    </h2>

                    <p className="mt-2 text-sm text-white/40">
                      Erstellt am {formatDate(project.created_at)}
                    </p>
                  </div>

                  <span className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-[10px] text-white/35">
                    {project.id.slice(0, 8)}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <ProjectDetail
                    label="Stil"
                    value={
                      styleLabels[project.style ?? ""] ??
                      project.style ??
                      "—"
                    }
                  />

                  <ProjectDetail
                    label="Videolänge"
                    value={
                      project.duration_seconds
                        ? `${project.duration_seconds} Sekunden`
                        : "—"
                    }
                  />

                  <ProjectDetail
                    label="Versuche"
                    value={String(project.generation_attempts)}
                  />

                  <ProjectDetail
                    label="Video"
                    value={
                      project.approved_video_path
                        ? "Verfügbar"
                        : "Noch nicht erstellt"
                    }
                  />
                </div>

                <AnalyzeProjectButton
  orderId={project.id}
  status={project.status}
/>

<div className="mt-6 border-t border-white/10 pt-5">
  <p className="text-xs leading-5 text-white/40">
    Ihre Anfrage wurde sicher gespeichert. Die automatische
    Videoerstellung wird in einer späteren Phase aktiviert.
  </p>
</div>
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardLoading() {
  return (
    <section className="w-full py-6">
      <div className="mb-8 h-12 w-64 animate-pulse rounded-xl bg-white/10" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
        <div className="h-96 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
      <p className="text-sm text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#ead28f]">
        {value}
      </p>
    </div>
  );
}

function ProjectDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-1 font-medium text-white/80">{value}</p>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
