/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { CopyTextButton } from "./copy-text-button";

type ProjectDetailsPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

type AiAnalysis = {
  room_summary?: string;
  visible_architecture?: string[];
  architecture_to_preserve?: string[];
  visible_materials?: string[];
  lighting_conditions?: string;
  perspective_observations?: string;
  deformation_risks?: string[];
  unsuitable_transformations?: string[];
  confidence_score?: number;
  human_review_required?: boolean;
  human_review_notes?: string;
  openai_request_id?: string | null;
};

type RecommendedSettings = {
  duration_seconds?: number;
  camera_motion?: string;
  motion_strength?: string;
  image_detail?: string;
  creativity?: string;
  aspect_ratio_recommendation?: string;
  generation_notes?: string;
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
  ai_analysis: AiAnalysis | null;
  kling_prompt: string | null;
  negative_prompt: string | null;
  recommended_settings: RecommendedSettings | null;
  prompt_model: string | null;
  prompt_created_at: string | null;
  prompt_error: string | null;
  created_at: string;
  updated_at: string;
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
  scandinavian: "Skandinavisch",
  modern_luxury: "Modern Luxury",
  architecture_preserved: "Originalarchitektur",
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  if (status === "failed") {
    return "border-red-400/25 bg-red-400/10 text-red-200";
  }

  if (
    status === "approved" ||
    status === "delivered" ||
    status === "prompt_ready"
  ) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status === "prompt_processing" ||
    status === "video_processing" ||
    status === "quality_review"
  ) {
    return "border-blue-400/25 bg-blue-400/10 text-blue-200";
  }

  return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#ead28f]";
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
        ai_analysis,
        kling_prompt,
        negative_prompt,
        recommended_settings,
        prompt_model,
        prompt_created_at,
        prompt_error,
        created_at,
        updated_at
      `,
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderError) {
    console.error("Could not load VimmoAI project:", orderError);
  }

  if (!orderData) {
    return (
      <section className="w-full py-8">
        <div className="rounded-[28px] border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-2xl font-bold text-white">
            Projekt nicht gefunden
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/55">
            Das Projekt existiert nicht oder Sie haben keine Berechtigung,
            es anzuzeigen.
          </p>

          <Link
            href="/protected"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-[#ead28f]"
          >
            Zurück zu meinen Projekten
          </Link>
        </div>
      </section>
    );
  }

  const order = orderData as OrderRow;
  const analysis = order.ai_analysis;
  const settings = order.recommended_settings;

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

  const projectTitle = `${
    propertyLabels[order.property_type ?? ""] ?? "Immobilienprojekt"
  } · ${roomLabels[order.room_type ?? ""] ?? "Objektbereich"}`;

  const confidenceScore =
    typeof analysis?.confidence_score === "number"
      ? Math.max(0, Math.min(100, analysis.confidence_score))
      : null;

  return (
    <section className="w-full py-4">
      <Link
        href="/protected"
        className="mb-7 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-[#e2c474]"
      >
        <span aria-hidden="true">←</span>
        Zurück zu meinen Projekten
      </Link>

      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c474] shadow-[0_0_12px_rgba(226,196,116,0.8)]" />

            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c474]">
              Projekt-Details
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            {projectTitle}
          </h1>

          <p className="mt-4 text-sm text-white/45">
            Projekt-ID: {order.id}
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

      <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

            <div className="aspect-[16/10] overflow-hidden bg-black/40">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Originalfoto des Immobilienprojekts"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  Kein Originalfoto verfügbar
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <h2 className="text-xl font-semibold text-white">
                Projektinformationen
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  label="Immobilientyp"
                  value={
                    propertyLabels[order.property_type ?? ""] ??
                    order.property_type ??
                    "—"
                  }
                />

                <InfoCard
                  label="Raum oder Bereich"
                  value={
                    roomLabels[order.room_type ?? ""] ??
                    order.room_type ??
                    "—"
                  }
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
                  label="Gewünschte Videolänge"
                  value={
                    order.duration_seconds
                      ? `${order.duration_seconds} Sekunden`
                      : "—"
                  }
                />

                <InfoCard
                  label="Kamerabewegung"
                  value={order.camera_motion ?? "—"}
                />

                <InfoCard
                  label="Verwendungszweck"
                  value={order.usage_type ?? "—"}
                />

                <InfoCard
                  label="Anfrage erstellt"
                  value={formatDate(order.created_at)}
                />

                <InfoCard
                  label="Prompt erstellt"
                  value={formatDate(order.prompt_created_at)}
                />
              </div>

              {order.notes ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/35">
                    Zusätzliche Wünsche
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
                    {order.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </article>

          {videoUrl ? (
            <article className="overflow-hidden rounded-[28px] border border-emerald-400/20 bg-white/[0.045] p-6 backdrop-blur-2xl">
              <h2 className="mb-5 text-xl font-semibold text-white">
                Freigegebenes Video
              </h2>

              <video
                src={videoUrl}
                controls
                className="w-full rounded-2xl bg-black"
              />
            </article>
          ) : null}
        </div>

        <div className="space-y-7">
          <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/60 to-transparent" />

            <h2 className="text-2xl font-semibold text-white">
              KI-Bildanalyse
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Visuelle Analyse des hochgeladenen Objektfotos.
            </p>

            {analysis ? (
              <>
                <div className="mt-6 rounded-2xl border border-[#d6b25e]/20 bg-[#d6b25e]/[0.07] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e2c474]">
                    Zusammenfassung
                  </p>

                  <p className="mt-3 leading-7 text-white/75">
                    {analysis.room_summary ?? "Keine Zusammenfassung verfügbar."}
                  </p>
                </div>

                {confidenceScore !== null ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-white/50">
                        Analyse-Konfidenz
                      </p>

                      <p className="text-xl font-bold text-[#ead28f]">
                        {confidenceScore}%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a9873e] to-[#e2c474]"
                        style={{
                          width: `${confidenceScore}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <AnalysisList
                  title="Sichtbare Architektur"
                  items={analysis.visible_architecture}
                />

                <AnalysisList
                  title="Unbedingt zu erhalten"
                  items={analysis.architecture_to_preserve}
                  highlighted
                />

                <AnalysisList
                  title="Sichtbare Materialien"
                  items={analysis.visible_materials}
                />

                <AnalysisText
                  title="Lichtverhältnisse"
                  value={analysis.lighting_conditions}
                />

                <AnalysisText
                  title="Perspektive"
                  value={analysis.perspective_observations}
                />

                <AnalysisList
                  title="Risiken möglicher Verformungen"
                  items={analysis.deformation_risks}
                  warning
                />

                <AnalysisList
                  title="Nicht geeignete Veränderungen"
                  items={analysis.unsuitable_transformations}
                  warning
                />

                <div
                  className={`mt-5 rounded-2xl border p-5 ${
                    analysis.human_review_required
                      ? "border-amber-400/25 bg-amber-400/10"
                      : "border-emerald-400/20 bg-emerald-400/10"
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      analysis.human_review_required
                        ? "text-amber-200"
                        : "text-emerald-200"
                    }`}
                  >
                    {analysis.human_review_required
                      ? "Menschliche Prüfung empfohlen"
                      : "Standardprüfung ausreichend"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {analysis.human_review_notes ||
                      "Keine zusätzlichen Prüfungshinweise."}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">
                Für dieses Projekt ist noch keine KI-Analyse vorhanden.
              </div>
            )}
          </article>
        </div>
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-2">
        <PromptCard
          eyebrow="Kling AI"
          title="Professioneller Video-Prompt"
          text={order.kling_prompt}
          buttonLabel="Prompt kopieren"
        />

        <PromptCard
          eyebrow="Negative Prompt"
          title="Schutz vor KI-Artefakten"
          text={order.negative_prompt}
          buttonLabel="Negativ-Prompt kopieren"
        />
      </div>

      <article className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e2c474]">
              Empfohlene Einstellungen
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Kling-AI-Konfiguration
            </h2>
          </div>

          {order.prompt_model ? (
            <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs text-white/45">
              {order.prompt_model}
            </span>
          ) : null}
        </div>

        {settings ? (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Empfohlene Dauer"
                value={
                  settings.duration_seconds
                    ? `${settings.duration_seconds} Sekunden`
                    : "—"
                }
              />

              <InfoCard
                label="Kamerabewegung"
                value={settings.camera_motion ?? "—"}
              />

              <InfoCard
                label="Bewegungsstärke"
                value={settings.motion_strength ?? "—"}
              />

              <InfoCard
                label="Bilddetail"
                value={settings.image_detail ?? "—"}
              />

              <InfoCard
                label="Kreativität"
                value={settings.creativity ?? "—"}
              />

              <InfoCard
                label="Seitenverhältnis"
                value={settings.aspect_ratio_recommendation ?? "—"}
              />
            </div>

            {settings.generation_notes ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs text-white/35">
                  Hinweise zur Generierung
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {settings.generation_notes}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-white/45">
            Noch keine empfohlenen Einstellungen vorhanden.
          </p>
        )}
      </article>

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

function ProjectDetailsLoading() {
  return (
    <section className="w-full py-8">
      <div className="h-10 w-52 animate-pulse rounded-xl bg-white/10" />

      <div className="mt-8 grid gap-7 xl:grid-cols-2">
        <div className="h-[650px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
        <div className="h-[650px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
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

function AnalysisList({
  title,
  items,
  warning = false,
  highlighted = false,
}: {
  title: string;
  items?: string[];
  warning?: boolean;
  highlighted?: boolean;
}) {
  const validItems = (items ?? []).filter(Boolean);

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-2xl border p-5 ${
        warning
          ? "border-amber-400/20 bg-amber-400/[0.06]"
          : highlighted
            ? "border-[#d6b25e]/20 bg-[#d6b25e]/[0.06]"
            : "border-white/10 bg-black/20"
      }`}
    >
      <h3 className="font-semibold text-white/85">{title}</h3>

      <ul className="mt-3 space-y-2">
        {validItems.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex gap-3 text-sm leading-6 text-white/60"
          >
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                warning ? "bg-amber-300" : "bg-[#d6b25e]"
              }`}
            />

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisText({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-semibold text-white/85">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {value}
      </p>
    </div>
  );
}

function PromptCard({
  eyebrow,
  title,
  text,
  buttonLabel,
}: {
  eyebrow: string;
  title: string;
  text: string | null;
  buttonLabel: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[#d6b25e]/20 bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/70 to-transparent" />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e2c474]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold text-white">
        {title}
      </h2>

      {text ? (
        <>
          <div className="mt-5 max-h-[480px] overflow-auto rounded-2xl border border-white/10 bg-black/35 p-5">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/70">
              {text}
            </pre>
          </div>

          <div className="mt-5">
            <CopyTextButton text={text} label={buttonLabel} />
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/45">
          Noch kein Text für dieses Projekt vorhanden.
        </p>
      )}
    </article>
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
