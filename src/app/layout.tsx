import type { Metadata } from "next";
import { Montserrat, Questrial } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "@/components/home/whatsapp-button";
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

export const metadata: Metadata = {
  title: "Modo Fundraising 2026 — Impacta VC",
  description: "Domina las skills que te llevan a levantar tu próxima ronda. 5ta edición del programa de fundraising para startups LatAm.",
  metadataBase: new URL("https://modofundraising.com"),
  openGraph: {
    title: "Modo Fundraising 2026 — Impacta VC",
    description: "Construye momentum que los inversionistas no puedan ignorar. 13 semanas, 100% online, LatAm.",
    url: "https://modofundraising.com",
    siteName: "Modo Fundraising",
    locale: "es_419",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modo Fundraising 2026 — Impacta VC",
    description: "Construye momentum que los inversionistas no puedan ignorar.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${questrial.variable}`}>
      <body className="font-sans antialiased bg-white text-zinc-900">
        {children}
        <WhatsAppButton />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
