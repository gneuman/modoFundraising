"use client";

import { useState } from "react";
import { Play, Loader2, X } from "lucide-react";

const LS_KEY = "mf_founder_email";

interface Props {
  claseId: string;
  meetUrl: string;
  label?: string;
  className?: string;
}

export function EnterMeetButton({ claseId, meetUrl, label = "Entrar", className }: Props) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function registrarYEntrar(email?: string) {
    setLoading(true);
    setError(null);

    const body: Record<string, string> = { claseId };
    if (email) body.email = email;

    try {
      const res = await fetch("/api/portal/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.status === 401 && data.error === "no_session") {
        // No hay sesión — pedir email
        setLoading(false);
        setShowModal(true);
        return;
      }

      if (res.status === 404 && data.error === "not_found") {
        setError("No encontramos tu correo en el programa. Verifica e intenta de nuevo.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        // Registrar falló pero igual dejamos entrar
        console.error("Error registrando asistencia:", data);
      }

      window.open(meetUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Si falla el registro, igual dejamos entrar
      window.open(meetUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    // Intentar con email guardado en localStorage
    const savedEmail = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    registrarYEntrar(savedEmail ?? undefined);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/portal/asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claseId, email }),
    });

    const data = await res.json();

    if (res.status === 404 && data.error === "not_found") {
      setError("No encontramos ese correo en el programa. ¿Es el mismo con el que te registraste?");
      setLoading(false);
      return;
    }

    if (res.ok) {
      localStorage.setItem(LS_KEY, email);
    }

    setShowModal(false);
    setLoading(false);
    window.open(meetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? "flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        {label}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-bold text-zinc-800 mb-1">Confirma tu correo</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Para registrar tu asistencia necesitamos verificar que estás en el programa.
            </p>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <input
                type="email"
                required
                autoFocus
                placeholder="tu@correo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar a la clase
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
