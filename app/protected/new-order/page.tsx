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
    <section className="w-full py-6">
      <Link
        href="/protected"
        className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-[#e2c474]"
      >
        <span>←</span>
        Zurück zum Dashboard
      </Link>

      <div className="relative overflow-hidden rounded-[30px] border border-[#d6b25e]/20 bg-white/[0.045] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e]/70 to-transparent" />

        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[90px]" />

        <header className="relative mb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/20 bg-[#d6b25e]/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c474] shadow-[0_0_12px_rgba(226,196,116,0.8)]" />

            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c474]">
              VimmoAI Studio
            </p>
          </div>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
            Vom Objektfoto zum
            <span className="bg-gradient-to-r from-[#f2dfaa] via-[#d6b25e] to-[#a9873e] bg-clip-text text-transparent">
              {" "}
              cinematischen Immobilienvideo
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">
            Laden Sie Ihr Objektfoto hoch und wählen Sie den gewünschten Stil.
            Ihre Anfrage und das Originalbild werden sicher Ihrem
            Benutzerkonto zugeordnet.
          </p>
        </header>

        <div className="relative">
          <OrderForm userId={userId} />
        </div>
      </div>
    </section>
  );
}

function NewOrderLoading() {
  return (
    <section className="w-full py-8">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <p className="text-sm text-white/50">
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
