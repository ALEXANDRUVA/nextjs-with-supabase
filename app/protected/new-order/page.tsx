import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "./order-form";

async function NewOrderContent() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  const userId = String(data.claims.sub);

  return (
    <section className="w-full max-w-4xl py-8">
      <Link
        href="/protected"
        className="mb-8 inline-flex text-sm text-foreground/60 transition hover:text-foreground"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="rounded-3xl border border-foreground/10 bg-background p-6 shadow-sm md:p-10">
        <header className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">
            VimmoAI Studio
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Neue Videoanfrage
          </h1>

          <p className="mt-4 max-w-2xl text-foreground/60">
            Laden Sie Ihr Objektfoto hoch und wählen Sie
            den gewünschten Stil. Ihre Anfrage und das
            Originalbild werden sicher Ihrem Benutzerkonto
            zugeordnet.
          </p>
        </header>

        <OrderForm userId={userId} />
      </div>
    </section>
  );
}

function NewOrderLoading() {
  return (
    <section className="w-full max-w-4xl py-8">
      <div className="rounded-3xl border border-foreground/10 p-8">
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
