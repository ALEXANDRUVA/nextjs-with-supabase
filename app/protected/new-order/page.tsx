import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function NewOrderContent() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <section className="w-full max-w-3xl py-8">
      <Link
        href="/protected"
        className="mb-8 inline-flex text-sm text-foreground/60 transition hover:text-foreground"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="rounded-2xl border border-foreground/10 bg-background p-6 shadow-sm md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">
            VimmoAI
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Neue Videoanfrage
          </h1>

          <p className="mt-4 max-w-2xl text-foreground/60">
            Erstellen Sie eine neue Anfrage für eine KI-gestützte
            Immobilienvisualisierung. Im nächsten Schritt können Sie Ihr
            Objektfoto hochladen und den gewünschten Videostil auswählen.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-foreground/20 p-8 text-center">
          <p className="font-medium">
            Die sichere VimmoAI-Bestellseite funktioniert.
          </p>

          <p className="mt-2 text-sm text-foreground/60">
            Das vollständige Formular wird als nächster Schritt eingefügt.
          </p>
        </div>
      </div>
    </section>
  );
}

function NewOrderLoading() {
  return (
    <section className="w-full max-w-3xl py-8">
      <div className="rounded-2xl border border-foreground/10 p-8">
        <p className="text-sm text-foreground/60">
          VimmoAI wird geladen...
        </p>
      </div>
    </section>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<NewOrderLoading />}>
      <NewOrderContent />
    </Suspense>
  );
}
