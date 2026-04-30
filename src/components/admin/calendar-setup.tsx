"use client";

import { useState } from "react";
import { CalendarDays, Check, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  hasCalendarId: boolean;
  // Clases sin evento de Calendar (para agendarlas retroactivamente)
  clasessinEvento: { id: string; titulo?: string; fecha?: string }[];
}

export function CalendarSetup({ hasCalendarId, clasessinEvento }: Props) {
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ calendarId: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(0);

  // Crear el calendario del programa (solo si no existe)
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
        toast.error(data.error.includes("scope") ? "Re-autorizá Google primero en /api/auth/gmail" : data.error);
        return;
      }
      setResult(data);
      toast.success("¡Calendario creado! Copiá el ID a Vercel.");
    } catch { toast.error("Error al crear el calendario"); }
    finally { setCreating(false); }
  }

  // Agendar en Calendar las clases que aún no tienen evento
  async function scheduleExisting() {
    setScheduling(true);
    try {
      const res = await fetch("/api/admin/calendar/schedule", { method: "POST" });
      const data = await res.json();
      setScheduled(data.scheduled ?? 0);
      toast.success(`${data.scheduled} clase${data.scheduled !== 1 ? "s" : ""} agendada${data.scheduled !== 1 ? "s" : ""} en Calendar`);
    } catch { toast.error("Error al agendar las clases"); }
    finally { setScheduling(false); }
  }

  // Ya tiene Calendar configurado
  if (hasCalendarId) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
          <Check className="h-3.5 w-3.5" />
          Google Calendar activo
        </div>
        {clasessinEvento.length > 0 && (
          <button
            onClick={scheduleExisting}
            disabled={scheduling}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {scheduling
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Agendando {scheduled}/{clasessinEvento.length}...</>
              : <><CalendarDays className="h-3.5 w-3.5" /> Agendar {clasessinEvento.length} clase{clasessinEvento.length !== 1 ? "s" : ""} sin evento</>}
          </button>
        )}
      </div>
    );
  }

  // No tiene Calendar — mostrar opción de crear
  if (result) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 max-w-sm">
        <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-green-600" /> Calendario creado
        </p>
        <p className="text-xs text-amber-700">Pegá este ID en Vercel como <code className="bg-amber-100 px-1 rounded">GOOGLE_CALENDAR_ID</code> y redesplegá:</p>
        <code className="block text-xs bg-white border border-amber-200 rounded px-2 py-1.5 break-all select-all text-zinc-800">
          {result.calendarId}
        </code>
        <a href="https://vercel.com" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
          Ir a Vercel <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={createCalendar}
        disabled={creating}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
        Crear calendario del programa
      </button>
      <p className="text-xs text-amber-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Primero re-autorizá Google en{" "}
        <a href="/api/auth/gmail" target="_blank" className="underline">
          /api/auth/gmail
        </a>
      </p>
    </div>
  );
}
