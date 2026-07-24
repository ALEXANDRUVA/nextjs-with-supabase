import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://app.vimmoai.com");

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  applicationName: "VimmoAI",
  title: {
    default: "VimmoAI – Immobilienvisualisierung",
    template: "%s | VimmoAI",
  },
  description:
    "Sichere Plattform für KI-gestützte Immobilienvisualisierung und die Vorbereitung cinematischer Immobilienvideos.",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "VimmoAI",
    title: "VimmoAI – Immobilienvisualisierung",
    description:
      "Vom Objektfoto zur strukturierten, cinematischen Immobilienpräsentation.",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
