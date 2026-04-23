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
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={160} height={48} className="object-contain" />
        </div>
        {enviado ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center space-y-4">
            {enlaceDirecto ? (
              <>
                <div className="text-4xl">🔑</div>
                <h2 className="text-xl font-bold text-zinc-800">Enlace de acceso listo</h2>
                <p className="text-zinc-500 text-sm">Haz clic para ingresar (válido 15 minutos):</p>
                <a
                  href={enlaceDirecto}
                  className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  Ingresar al portal
                </a>
              </>
            ) : (
              <>
                <div className="text-4xl">📬</div>
                <h2 className="text-xl font-bold text-zinc-800">Revisa tu email</h2>
                <p className="text-zinc-500 text-sm">
                  Enviamos un enlace de acceso a <strong>{email}</strong>. Válido por 15 minutos.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
            <h1 className="text-xl font-bold text-zinc-800 mb-6">Acceder al portal</h1>
            <form onSubmit={manejarEnvio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@startup.com"
                  required
                />
              </div>
              <Button type="submit" disabled={cargando} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {cargando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando...</> : "Ingresar"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
