"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type Props = {
  titulo: string;
  subtitulo: string;
  placeholder?: string;
  ctaLabel?: string;
  ctaPostular?: { label: string; href: string } | null;
  aviso?: string | null;
};

export function MagicLoginForm({
  titulo,
  subtitulo,
  placeholder = "tu@correo.com",
  ctaLabel = "Enviar enlace",
  ctaPostular = null,
  aviso = null,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al enviar el enlace");
        return;
      }
      setEnviado(email);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #181b2f 0%, #1a0d2e 50%, #181b2f 100%)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={180} height={54} className="object-contain" />
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-sm p-8">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-white/10 p-3">
                  <Mail className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white">Revisa tu correo</h1>
              <p className="text-sm text-white/60">
                Enviamos un enlace de acceso a <strong className="text-white">{enviado}</strong>. Es válido por 15 minutos.
              </p>
              <button
                type="button"
                onClick={() => { setEnviado(null); setError(null); }}
                className="text-xs text-white/40 hover:text-white underline transition-colors"
              >
                Usar otro email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-2">{titulo}</h1>
              <p className="text-sm text-white/40 mb-6">{subtitulo}</p>

              {aviso && (
                <p className="text-sm text-white/80 bg-white/10 border border-white/20 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-white/60" />
                  <span>{aviso}</span>
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  name="email"
                  placeholder={placeholder}
                  required
                  autoFocus
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30"
                />

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full text-white"
                  style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)" }}
                >
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : ctaLabel}
                </Button>
              </form>
            </>
          )}
        </div>

        {ctaPostular && (
          <p className="text-center text-xs text-white/30">
            {ctaPostular.label}{" "}
            <a href={ctaPostular.href} className="text-white/50 hover:text-white underline transition-colors">
              Postula al programa
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
