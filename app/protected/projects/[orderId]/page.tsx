/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

type ProjectDetailsPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

type OrderRow = {
  id: string;
  user_id: string;
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
  created_at: string;
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

const cameraMotionLabels: Record<string, string> = {
  slow_forward: "Ruhige Vorwärtsbewegung",
  dolly_in: "Sanfte Annäherung",
  pan_left: "Langsame Bewegung nach links",
  pan_right: "Langsame Bewegung nach rechts",
  orbit: "Leichte Rundbewegung",
  static: "Ruhige Perspektive",
};

const usageTypeLabels: Record<string, string> = {
  social_media: "Social Media",
  immobilienportal: "Immobilienportal",
  website: "Website",
  praesentationen: "Präsentation",
  werbung: "Werbung",
};

const progressSteps = [
  "Anfrage",
  "Vorbereitung",
  "Qualitätsprüfung",
  "Fertig",
];

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusText(status: string) {
  switch (status) {
    case "draft":
      return "Das Projekt wurde als Entwurf gespeichert.";

    case "image_uploaded":
      return "Ihre Anfrage und das Objektfoto wurden erfolgreich gespeichert.";

    case "payment_pending":
      return "Die Anfrage wurde gespeichert. Die Zahlung ist noch ausstehend.";

    case "paid":
      return "Die Zahlung wurde bestätigt. Ihr Projekt wird als Nächstes vorbereitet.";

    case "prompt_processing":
      return "Ihr Projekt wird derzeit für die Videoproduktion vorbereitet.";

    case "prompt_ready":
      return "Die Vorbereitung ist abgeschlossen. Ihr Projekt wird für die Produktion eingeplant.";

    case "video_queued":
      return "Ihr Projekt wurde für die Videoproduktion eingeplant.";

    case "video_processing":
      return "Ihr Immobilienvideo wird derzeit erstellt.";

    case "quality_review":
      return "Das Ergebnis wird momentan persönlich auf Qualität geprüft.";

    case "approved":
      return "Das Video wurde geprüft und für die Bereitstellung freigegeben.";

    case "delivered":
      return "Ihr fertiges Immobilienvideo steht zur Verfügung.";

    case "failed":
      return "Das Projekt benötigt eine interne Prüfung. Sie müssen derzeit nichts unternehmen.";

    case "refunded":
      return "Die Zahlung für dieses Projekt wurde erstattet.";

    default:
      return "Ihr Projekt wurde erfolgreich gespeichert.";
  }
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

  return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#ead28f]";
}

function getProgressIndex(status: string) {
  switch (status) {
    case "draft":
    case "image_uploaded":
    case "payment_pending":
      return 0;

    case "paid":
    case "prompt_processing":
    case "prompt_ready":
    case "video_queued":
    case "video_processing":
      return 1;

    case "quality_review":
    case "approved":
      return 2;

    case "delivered":
      return 3;

    default:
      return 0;
  }
}

async function ProjectDetailsContent({
  params,
}: ProjectDetailsPageProps) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/auth/login");
  }

  const userId = String(authData.claims.sub);

  const { data: orderData, error: orderError } = await supabase
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
        camera_motion,
        usage_type,
        notes,
        original_image_path,
        approved_video_path,
        created_at
      `,
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderError) {
    console.error("Could not load project:", orderError);
  }

  if (!orderData) {
    return (
      <section className="w-full py-8">
        <div className="rounded-[28px] border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-2xl font-bold text-white">
            Projekt nicht gefunden
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            Das Projekt existiert nicht oder Sie haben keine
            Berechtigung, es anzuzeigen.
          </p>

          <Link
            href="/protected"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-[#ead28f]"
          >
            Zurück zu meinen Projekten
          </Link>
        </div>
      </section>
    );
  }

  const order = orderData as OrderRow;

  let imageUrl: string | null = null;
  let videoUrl: string | null = null;

  if (order.original_image_path) {
    const { data, error } = await supabase.storage
      .from("original-images")
      .createSignedUrl(order.original_image_path, 3600);

    if (error) {
      console.error("Could not create image URL:", error);
    }

    imageUrl = data?.signedUrl ?? null;
  }

  if (order.approved_video_path) {
    const { data, error } = await supabase.storage
      .from("generated-videos")
      .createSignedUrl(order.approved_video_path, 3600);

    if (error) {
      console.error("Could not create video URL:", error);
    }

    videoUrl = data?.signedUrl ?? null;
  }

  const propertyLabel =
    propertyLabels[order.property_type ?? ""] ??
    order.property_type ??
    "Immobilienprojekt";

  const roomLabel =
    roomLabels[order.room_type ?? ""] ??
    order.room_type ??
    "Objektbereich";

  const projectTitle = `${propertyLabel} · ${roomLabel}`;
  const progressIndex = getProgressIndex(order.status);

  return (
    <section className="w-full py-4">
      <Link
        href="/protected"
        className="mb-7 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-[#e2c474]"
      >
        <span aria-hidden="true">←</span>
        Zurück zu meinen Projekten
      </Link>

      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c474] shadow-[0_0_12px_rgba(226,196,116,0.8)]" />

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e2c474]">
              Projektübersicht
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            {projectTitle}
          </h1>

          <p className="mt-3 text-sm text-white/40">
            Projekt {order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClasses(
            order.status,
          )}`}
        >
          {statusLabels[order.status] ?? order.status}
        </span>
      </header>

      <div className="grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="aspect-[16/10] overflow-hidden bg-black/40">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Hochgeladenes Objektfoto"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/40">
                Kein Objektfoto verfügbar
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white">
              Ihre Anfrage
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard
                label="Immobilientyp"
                value={propertyLabel}
              />

              <InfoCard
                label="Raum oder Bereich"
                value={roomLabel}
              />

              <InfoCard
                label="Gewünschter Stil"
                value={
                  styleLabels[order.style ?? ""] ??
                  order.style ??
                  "—"
                }
              />

              <InfoCard
                label="Videolänge"
                value={
                  order.duration_seconds
                    ? `${order.duration_seconds} Sekunden`
                    : "—"
                }
              />

              <InfoCard
                label="Kameraführung"
                value={
                  cameraMotionLabels[order.camera_motion ?? ""] ??
                  order.camera_motion ??
                  "—"
                }
              />

              <InfoCard
                label="Verwendungszweck"
                value={
                  usageTypeLabels[order.usage_type ?? ""] ??
                  order.usage_type ??
                  "—"
                }
              />
            </div>

            {order.notes ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-white/35">
                  Zusätzliche Wünsche
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {order.notes}
                </p>
              </div>
            ) : null}

            <p className="mt-5 text-xs text-white/30">
              Anfrage erstellt am {formatDate(order.created_at)}
            </p>
          </div>
        </article>

        <div className="space-y-7">
          <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e2c474]">
              Aktueller Stand
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-white">
              {statusLabels[order.status] ?? order.status}
            </h2>

            <p className="mt-4 leading-7 text-white/55">
              {getStatusText(order.status)}
            </p>

            <div className="mt-6 rounded-2xl border border-[#d6b25e]/20 bg-[#d6b25e]/[0.07] p-5">
              <p className="font-semibold text-[#ead28f]">
                Persönliche Qualitätskontrolle
              </p>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Das Ergebnis wird vor der Bereitstellung persönlich
                geprüft. Erst danach wird das fertige Video freigegeben.
              </p>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-2xl md:p-8">
            <h2 className="text-xl font-semibold text-white">
              Projektfortschritt
            </h2>

            <div className="mt-6 space-y-5">
              {progressSteps.map((step, index) => {
                const isCompleted = index < progressIndex;
                const isCurrent = index === progressIndex;

                return (
                  <div
                    key={step}
                    className="flex items-center gap-4"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                        isCompleted
                          ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                          : isCurrent
                            ? "border-[#d6b25e]/45 bg-[#d6b25e]/15 text-[#ead28f]"
                            : "border-white/10 bg-white/[0.04] text-white/25"
                      }`}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-medium ${
                          isCompleted || isCurrent
                            ? "text-white/80"
                            : "text-white/30"
                        }`}
                      >
                        {step}
                      </p>
                    </div>

                    {isCurrent ? (
                      <span className="rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-3 py-1 text-xs font-semibold text-[#ead28f]">
                        Aktuell
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </div>

      {videoUrl ? (
        <article className="mt-7 overflow-hidden rounded-[28px] border border-emerald-400/20 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:p-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Fertiges Projekt
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Ihr Immobilienvideo
            </h2>
          </div>

          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full rounded-2xl bg-black"
          />
        </article>
      ) : null}

      <div className="mt-8 flex justify-center">
        <Link
          href="/protected"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold text-white/75 transition hover:border-[#d6b25e]/35 hover:text-[#ead28f]"
        >
          Zurück zum Dashboard
        </Link>
      </div>
    </section>
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
      <p className="text-xs text-white/35">{label}</p>

      <p className="mt-1.5 break-words font-medium text-white/80">
        {value}
      </p>
    </div>
  );
}

function ProjectDetailsLoading() {
  return (
    <section className="w-full py-8">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" />

      <div className="mt-8 grid gap-7 xl:grid-cols-2">
        <div className="h-[620px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />

        <div className="h-[620px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
      </div>
    </section>
  );
}

export default function ProjectDetailsPage({
  params,
}: ProjectDetailsPageProps) {
  return (
    <Suspense fallback={<ProjectDetailsLoading />}>
      <ProjectDetailsContent params={params} />
    </Suspense>
  );
}
