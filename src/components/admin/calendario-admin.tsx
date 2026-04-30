"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Video, Users, ExternalLink, RefreshCw, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CalEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  meetLink?: string;
  htmlLink: string;
  attendeesCount: number;
  status: string;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function CalendarioAdmin({ calendarId }: { calendarId?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/calendar/events");
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setEvents(data.events ?? []);
    } catch { setError("Error al cargar el calendario"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const icalUrl = calendarId
    ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`
    : null;

  const gcalUrl = calendarId
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`
    : "https://calendar.google.com";

  // Agrupa eventos por mes
  const byMonth = events.reduce<Record<string, CalEvent[]>>((acc, ev) => {
    const key = new Date(ev.start).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Calendario del programa</h1>
          <p className="text-sm text-zinc-500 mt-1">Agenda de clases desde Google Calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-800 border border-zinc-200 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <a
            href={gcalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir en Google Calendar
          </a>
        </div>
      </div>

      {/* iCal link para compartir */}
      {icalUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-blue-800">Link de suscripción al calendario</p>
            <p className="text-xs text-blue-600">Los founders pueden pegarlo en Google Calendar, Apple Calendar o Outlook para tener todas las clases en su agenda automáticamente.</p>
            <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2 mt-2">
              <code className="text-xs text-zinc-700 flex-1 truncate">{icalUrl}</code>
              <CopyButton text={icalUrl} />
            </div>
          </div>
        </div>
      )}

      {!calendarId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">GOOGLE_CALENDAR_ID no configurado</p>
            <p className="text-xs text-amber-600 mt-0.5">Andá a la página de <a href="/admin/clases" className="underline font-medium">Clases</a>, creá el calendario del programa y pegá el ID en Vercel.</p>
          </div>
        </div>
      )}

      {/* Agenda */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando agenda...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Error al cargar el calendario</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            {(error.includes("scope") || error.includes("403")) && (
              <a href="/api/auth/gmail" target="_blank" className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold mt-2 underline">
                Re-autorizar Google →
              </a>
            )}
          </div>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-12 text-center text-zinc-400 text-sm">
          No hay eventos próximos en el calendario.<br />
          <span className="text-xs mt-1 block">Creá una clase con fecha desde la sección <a href="/admin/clases" className="text-blue-500 underline">Clases</a>.</span>
        </div>
      )}

      {!loading && !error && Object.entries(byMonth).map(([mes, evs]) => (
        <div key={mes} className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1 capitalize">{mes}</h2>

          {evs.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-blue-200 transition-colors">
              <div className="flex items-start gap-4 p-5">
                {/* Fecha pill */}
                <div className="shrink-0 w-14 text-center bg-blue-50 rounded-xl py-2">
                  <p className="text-lg font-bold text-blue-700 leading-none">
                    {new Date(ev.start).getDate()}
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5 capitalize">
                    {new Date(ev.start).toLocaleDateString("es-MX", { weekday: "short" })}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800">{ev.summary}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {formatFecha(ev.start)} · {formatHora(ev.start)} – {formatHora(ev.end)}
                  </p>
                  {ev.description && (
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{ev.description}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {ev.meetLink && (
                    <a
                      href={ev.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" /> Entrar a Meet
                    </a>
                  )}
                  <a
                    href={ev.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver en Calendar
                  </a>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users className="h-3 w-3" />
                    {ev.attendeesCount} invitado{ev.attendeesCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
