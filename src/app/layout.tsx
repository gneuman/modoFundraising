import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Modo Fundraising 2026 — Impacta VC",
  description: "Domina las skills que te llevan a levantar tu próxima ronda. 5ta edición del programa de fundraising para startups LatAm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="font-[var(--font-montserrat)] antialiased bg-white text-zinc-900">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
