"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function PaginaLogin() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enlaceDirecto, setEnlaceDirecto] = useState<string | null>(null);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setCargando(true);
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnviado(true);
        if (data.enlace) {
          setEnlaceDirecto(data.enlace);
        }
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Error al generar el enlace");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #181b2f 0%, #1a0d2e 50%, #181b2f 100%)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={180} height={54} className="object-contain" />
        </div>
        {enviado ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-sm p-8 text-center space-y-4">
            {enlaceDirecto ? (
              <>
                <div className="text-4xl">🔑</div>
                <h2 className="text-xl font-bold text-white">Enlace de acceso listo</h2>
                <p className="text-white/50 text-sm">Haz clic para ingresar (válido 15 minutos):</p>
                <a
                  href={enlaceDirecto}
                  className="inline-block w-full text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)" }}
                >
                  Ingresar al portal
                </a>
              </>
            ) : (
              <>
                <div className="text-4xl">📬</div>
                <h2 className="text-xl font-bold text-white">Revisa tu email</h2>
                <p className="text-white/50 text-sm">
                  Enviamos un enlace de acceso a <strong className="text-white">{email}</strong>. Válido por 15 minutos.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-sm p-8">
            <h1 className="text-xl font-bold text-white mb-6">Acceder al portal</h1>
            <form onSubmit={manejarEnvio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@startup.com"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30"
                />
              </div>
              <Button
                type="submit"
                disabled={cargando}
                className="w-full text-white"
                style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)" }}
              >
                {cargando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando...</> : "Ingresar"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
