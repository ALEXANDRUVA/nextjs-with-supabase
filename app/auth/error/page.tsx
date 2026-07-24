import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  await searchParams;

  return (
    <p className="text-sm leading-6 text-muted-foreground">
      Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet.
      Fordern Sie bei Bedarf einen neuen Link an.
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Anmeldung nicht möglich
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>

          <Link
            href="/auth/login"
            className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            Zurück zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
