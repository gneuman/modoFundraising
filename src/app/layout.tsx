import type { Metadata } from "next";
import { Montserrat, Questrial, Bebas_Neue } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "@/components/home/whatsapp-button";
import { GTMScript, GTMNoScript } from "@/components/analytics/gtm";
import { AttributionCapture } from "@/components/analytics/attribution-capture";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
});

const BASE_URL = "https://modofundraising.com";

export const metadata: Metadata = {
  title: {
    default: "Modo Fundraising 2026 — Impacta VC",
    template: "%s — Modo Fundraising 2026",
  },
  description: "Domina las skills que te llevan a levantar tu próxima ronda. 5ta edición del programa de fundraising para startups LatAm.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: BASE_URL,
    languages: { "es-419": BASE_URL },
  },
  openGraph: {
    title: "Modo Fundraising 2026 — Impacta VC",
    description: "Construye momentum que los inversionistas no puedan ignorar. 13 semanas, 100% online, LatAm.",
    url: BASE_URL,
    siteName: "Modo Fundraising",
    locale: "es_419",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Modo Fundraising 2026 — Impacta VC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Modo Fundraising 2026 — Impacta VC",
    description: "Construye momentum que los inversionistas no puedan ignorar.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${questrial.variable} ${bebasNeue.variable}`}>
      <body className="font-sans antialiased bg-white text-zinc-900">
        <GTMScript />
        <GTMNoScript />
        <AttributionCapture />
        {children}
        {process.env.SHOW_WHATSAPP_WIDGET === "true" && <WhatsAppButton />}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
