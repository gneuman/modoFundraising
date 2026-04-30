"use client";

import { useState } from "react";
import { CalendarDays, Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function CalendarSetup({ hasCalendarId }: { hasCalendarId: boolean }) {
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ calendarId: string; instruction: string } | null>(null);

  async function createCalendar() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Modo Fundraising 2026" }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error.includes("scope") || res.status === 403) {
          toast.error("Necesitás re-autorizar Google. Ir a /api/auth/gmail primero.");
        } else {
          toast.error(data.error);
        }
        return;
      }
      setResult(data);
      toast.success("¡Calendario creado! Copiá el ID a Vercel.");
    } catch { toast.error("Error al crear el calendario"); }
    finally { setCreating(false); }
  }

  if (hasCalendarId) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
        <Check className="h-3.5 w-3.5" />
        Google Calendar activo — los eventos se crean automáticamente
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!result ? (
        <button
          onClick={createCalendar}
          disabled={creating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {creating
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CalendarDays className="h-4 w-4" />}
          Crear calendario del programa
        </button>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 max-w-sm">
          <p className="text-xs font-bold text-amber-800">¡Calendario creado!</p>
          <p className="text-xs text-amber-700">Copiá este ID en Vercel como <code className="bg-amber-100 px-1 rounded">GOOGLE_CALENDAR_ID</code> y redesplegá:</p>
          <code className="block text-xs bg-white border border-amber-200 rounded px-2 py-1.5 break-all select-all text-zinc-800">
            {result.calendarId}
          </code>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Ir a Vercel <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      <p className="text-xs text-zinc-400">
        ⚠️ Primero asegurate de haber re-autorizado Google con los nuevos scopes en{" "}
        <a href="/api/auth/gmail" target="_blank" className="text-blue-500 underline">/api/auth/gmail</a>
      </p>
    </div>
  );
}
