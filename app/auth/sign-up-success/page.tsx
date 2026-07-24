import { AuthShell } from "@/components/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Registrierung fast abgeschlossen
          </CardTitle>
          <CardDescription>
            Bestätigen Sie Ihre E-Mail-Adresse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Wir haben Ihnen einen Bestätigungslink gesendet. Öffnen Sie den
            Link, bevor Sie sich anmelden.
          </p>

          <Link
            href="/auth/login"
            className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            Zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
