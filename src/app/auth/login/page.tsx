"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function PaginaLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al ingresar");
        return;
      }
      // Hard navigation para que el browser cargue la cookie
      window.location.href = data.redirect;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
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
          <h1 className="text-xl font-bold text-white mb-2">Acceder al portal</h1>
          <p className="text-sm text-white/40 mb-6">Ingresá con el email que usaste para postular.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder="tu@startup.com"
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
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verificando...</> : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30">
          ¿No tenés acceso?{" "}
          <a href="/apply" className="text-white/50 hover:text-white underline transition-colors">
            Postulá al programa
          </a>
        </p>
      </div>
    </main>
  );
}
