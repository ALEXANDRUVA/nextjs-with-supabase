"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type OrderFormProps = {
  userId: string;
};

type SuccessState = {
  orderId: string;
} | null;

function getRequiredValue(formData: FormData, field: string): string {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Bitte füllen Sie das Feld „${field}“ aus.`);
  }

  return value.trim();
}

export function OrderForm({ userId }: OrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<SuccessState>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccess(null);

    let createdOrderId: string | null = null;
    let uploadedFilePath: string | null = null;

    try {
      const propertyType = getRequiredValue(
        formData,
        "property_type",
      );

      const roomType = getRequiredValue(
        formData,
        "room_type",
      );

      const style = getRequiredValue(
        formData,
        "style",
      );

      const durationValue = getRequiredValue(
        formData,
        "duration_seconds",
      );

      const cameraMotion = getRequiredValue(
        formData,
        "camera_motion",
      );

      const usageType = getRequiredValue(
        formData,
        "usage_type",
      );

      const notesValue = formData.get("notes");

      const notes =
        typeof notesValue === "string" && notesValue.trim()
          ? notesValue.trim()
          : null;

      const image = formData.get("image");

      if (!(image instanceof File) || image.size === 0) {
        throw new Error(
          "Bitte wählen Sie ein Immobilienfoto aus.",
        );
      }

      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        throw new Error(
          "Erlaubte Dateiformate: JPG, PNG und WebP.",
        );
      }

      if (image.size > MAX_IMAGE_SIZE) {
        throw new Error(
          "Das Foto darf maximal 20 MB groß sein.",
        );
      }

      const durationSeconds = Number(durationValue);

      if (![5, 10, 15].includes(durationSeconds)) {
        throw new Error(
          "Bitte wählen Sie eine gültige Videolänge.",
        );
      }

      const supabase = createClient();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          property_type: propertyType,
          room_type: roomType,
          style,
          duration_seconds: durationSeconds,
          camera_motion: cameraMotion,
          usage_type: usageType,
          notes,
        })
        .select("id")
        .single();

      if (orderError || !order?.id) {
        throw new Error(
          orderError?.message ||
            "Die Anfrage konnte nicht erstellt werden.",
        );
      }

      createdOrderId = order.id;

      const extension = FILE_EXTENSIONS[image.type];

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const filePath =
        `${userId}/${order.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("original-images")
        .upload(filePath, image, {
          cacheControl: "3600",
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        await supabase.rpc("delete_draft_order", {
          p_order_id: order.id,
        });

        throw new Error(
          uploadError.message ||
            "Das Foto konnte nicht hochgeladen werden.",
        );
      }

      uploadedFilePath = filePath;

      const { error: finalizeError } = await supabase.rpc(
        "complete_order_upload",
        {
          p_order_id: order.id,
          p_original_image_path: filePath,
        },
      );

      if (finalizeError) {
        await supabase.storage
          .from("original-images")
          .remove([filePath]);

        await supabase.rpc("delete_draft_order", {
          p_order_id: order.id,
        });

        throw new Error(
          finalizeError.message ||
            "Die Anfrage konnte nicht abgeschlossen werden.",
        );
      }

      form.reset();

      setSuccess({
        orderId: order.id,
      });
    } catch (error) {
      console.error("VimmoAI order error:", {
        error,
        createdOrderId,
        uploadedFilePath,
      });

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ein unerwarteter Fehler ist aufgetreten.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
    >
      {success ? (
        <div
          className="rounded-xl border border-green-500/30 bg-green-500/10 p-5"
          role="status"
        >
          <p className="font-semibold text-green-700 dark:text-green-300">
            Ihre Anfrage wurde erfolgreich übermittelt.
          </p>

          <p className="mt-2 text-sm text-foreground/70">
            Bestellnummer:
            {" "}
            <span className="font-mono">
              {success.orderId}
            </span>
          </p>

          <Link
            href="/protected"
            className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            Zum Dashboard
          </Link>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          label="Immobilientyp"
          htmlFor="property_type"
        >
          <select
            id="property_type"
            name="property_type"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option value="wohnung">Wohnung</option>
            <option value="haus">Haus</option>
            <option value="neubau">Neubau</option>
            <option value="gewerbe">
              Gewerbeimmobilie
            </option>
          </select>
        </FormField>

        <FormField
          label="Raum oder Bereich"
          htmlFor="room_type"
        >
          <select
            id="room_type"
            name="room_type"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option value="wohnzimmer">
              Wohnzimmer
            </option>
            <option value="schlafzimmer">
              Schlafzimmer
            </option>
            <option value="kueche">Küche</option>
            <option value="badezimmer">
              Badezimmer
            </option>
            <option value="aussenbereich">
              Außenbereich
            </option>
            <option value="gesamte_immobilie">
              Gesamte Immobilie
            </option>
          </select>
        </FormField>

        <FormField
          label="Gewünschter Stil"
          htmlFor="style"
        >
          <select
            id="style"
            name="style"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option value="modern">Modern</option>
            <option value="warm_minimalism">
              Warm Minimalism
            </option>
            <option value="japandi">Japandi</option>
            <option value="scandinavian">
              Scandinavian
            </option>
            <option value="modern_luxury">
              Modern Luxury
            </option>
            <option value="architecture_preserved">
              Originalarchitektur beibehalten
            </option>
          </select>
        </FormField>

        <FormField
          label="Videolänge"
          htmlFor="duration_seconds"
        >
          <select
            id="duration_seconds"
            name="duration_seconds"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option value="5">5 Sekunden</option>
            <option value="10">10 Sekunden</option>
            <option value="15">15 Sekunden</option>
          </select>
        </FormField>

       <FormField
  label="Kameraführung"
  htmlFor="camera_motion"
>
  <select
    id="camera_motion"
    name="camera_motion"
    required
    defaultValue=""
    className={inputClasses}
  >
    <option value="" disabled>
      Bitte auswählen
    </option>

    <option value="doorway_entrance">
      Eingang durch die Tür
    </option>

    <option value="slow_dolly_in">
      Langsamer Dolly-In
    </option>

    <option value="lateral_slide">
      Sanfte Seitwärtsbewegung
    </option>

    <option value="slow_pan">
      Langsamer Pan
    </option>

    <option value="automatic">
      Automatische Empfehlung
    </option>
  </select>
</FormField>

        <FormField
          label="Verwendungszweck"
          htmlFor="usage_type"
        >
          <select
            id="usage_type"
            name="usage_type"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option value="immobilienportal">
              Immobilienportal
            </option>
            <option value="website">Website</option>
            <option value="social_media">
              Instagram / TikTok
            </option>
            <option value="expose">Exposé</option>
            <option value="werbung">Werbung</option>
          </select>
        </FormField>
      </div>

      <FormField
        label="Zusätzliche Wünsche"
        htmlFor="notes"
        optional
      >
        <textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={1500}
          placeholder="Beschreiben Sie besondere Wünsche, Materialien, Lichtstimmung oder gewünschte Details."
          className={inputClasses}
        />
      </FormField>

      <div className="rounded-2xl border border-dashed border-foreground/20 p-6">
        <label
          htmlFor="image"
          className="block font-semibold"
        >
          Originalfoto hochladen
        </label>

        <p className="mt-2 text-sm text-foreground/60">
          JPG, PNG oder WebP, maximal 20 MB.
          Für den ersten Funktionstest empfehlen wir
          eine Datei unter 6 MB.
        </p>

        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="mt-5 block w-full cursor-pointer rounded-xl border border-foreground/15 bg-background p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-foreground file:px-4 file:py-2 file:font-semibold file:text-background"
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-foreground/10 p-4 text-sm">
        <input
          type="checkbox"
          name="image_rights"
          required
          className="mt-1 h-4 w-4"
        />

        <span className="text-foreground/70">
          Ich bestätige, dass ich berechtigt bin,
          das hochgeladene Bild für eine
          KI-gestützte Immobilienvisualisierung
          zu verwenden.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-foreground px-6 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Anfrage wird erstellt..."
          : "Anfrage sicher übermitteln"}
      </button>

      <p className="text-center text-xs text-foreground/50">
        Die finale Videogenerierung startet noch nicht
        automatisch. Jede Anfrage wird zunächst geprüft.
      </p>
    </form>
  );
}

const inputClasses =
  "w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-foreground outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10";

function FormField({
  label,
  htmlFor,
  optional = false,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold"
      >
        {label}

        {optional ? (
          <span className="ml-2 font-normal text-foreground/45">
            optional
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}
