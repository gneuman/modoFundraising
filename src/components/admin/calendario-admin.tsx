"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays, Video, Users, ExternalLink, RefreshCw, Loader2,
  AlertCircle, Copy, Check, UserPlus, ChevronLeft, ChevronRight, X, List,
} from "lucide-react";
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

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Modal de detalle de evento ───────────────────────────────────────────────

function EventModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-zinc-800">{event.summary}</h2>
          <p className="text-sm text-zinc-500 mt-1">{formatFechaLarga(event.start)}</p>
          <p className="text-sm text-zinc-400">{formatHora(event.start)} – {formatHora(event.end)}</p>
        </div>

        {event.description && (
          <p className="text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
            {event.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-zinc-500 border-t border-zinc-100 pt-3">
          <Users className="h-4 w-4" />
          <span>{event.attendeesCount} invitado{event.attendeesCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="flex gap-2 pt-1">
          {event.meetLink && (
            <a href={event.meetLink} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Video className="h-4 w-4" /> Entrar a Meet
            </a>
          )}
          <a href={event.htmlLink} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm px-4 py-2.5 rounded-xl transition-colors">
            <ExternalLink className="h-4 w-4" /> Ver en Calendar
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Vista mensual ────────────────────────────────────────────────────────────

function MonthView({ events, onSelectEvent }: { events: CalEvent[]; onSelectEvent: (e: CalEvent) => void }) {
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Celdas del grid: 42 (6 semanas)
  const cells: (number | null)[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push(-(prevMonthDays - i)); // días del mes anterior (negativos)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null); // días del mes siguiente

  function eventsForDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.start);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const mesNombre = current.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const hoy = new Date();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-bold text-zinc-800 capitalize">{mesNombre}</h2>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-zinc-100">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-zinc-400 py-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isCurrentMonth = cell !== null && cell > 0;
          const day = isCurrentMonth ? cell! : Math.abs(cell ?? 0);
          const isHoy = isCurrentMonth &&
            hoy.getFullYear() === year && hoy.getMonth() === month && hoy.getDate() === day;
          const dayEvents = isCurrentMonth ? eventsForDay(day) : [];

          return (
            <div key={i} className={`min-h-[80px] p-1.5 border-b border-r border-zinc-100 ${!isCurrentMonth ? "bg-zinc-50/50" : ""}`}>
              <p className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                ${isHoy ? "bg-blue-600 text-white" : isCurrentMonth ? "text-zinc-700" : "text-zinc-300"}`}>
                {day}
              </p>
              <div className="space-y-0.5">
                {dayEvents.map((ev) => (
                  <button key={ev.id} onClick={() => onSelectEvent(ev)}
                    className="w-full text-left text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium px-1.5 py-0.5 rounded truncate transition-colors">
                    {formatHora(ev.start)} {ev.summary}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista agenda (lista) ─────────────────────────────────────────────────────

function AgendaView({ events, onSelectEvent }: { events: CalEvent[]; onSelectEvent: (e: CalEvent) => void }) {
  const byMonth = events.reduce<Record<string, CalEvent[]>>((acc, ev) => {
    const key = new Date(ev.start).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  if (!events.length) {
    return (
      <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-12 text-center text-zinc-400 text-sm">
        No hay eventos próximos.<br />
        <span className="text-xs mt-1 block">Creá una clase con fecha desde <a href="/admin/clases" className="text-blue-500 underline">Clases</a>.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(byMonth).map(([mes, evs]) => (
        <div key={mes} className="space-y-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest capitalize">{mes}</h3>
          {evs.map((ev) => (
            <button key={ev.id} onClick={() => onSelectEvent(ev)}
              className="w-full text-left bg-white rounded-2xl border border-zinc-200 hover:border-blue-200 transition-colors overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="shrink-0 w-12 text-center bg-blue-50 rounded-xl py-2">
                  <p className="text-lg font-bold text-blue-700 leading-none">{new Date(ev.start).getDate()}</p>
                  <p className="text-xs text-blue-500 capitalize">{new Date(ev.start).toLocaleDateString("es-MX", { weekday: "short" })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800 truncate">{ev.summary}</p>
                  <p className="text-sm text-zinc-400">{formatHora(ev.start)} – {formatHora(ev.end)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{ev.attendeesCount}</span>
                  {ev.meetLink && <span className="flex items-center gap-1 text-green-600"><Video className="h-3.5 w-3.5" />Meet</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CalendarioAdmin({ calendarId }: { calendarId?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ invited: number; events: number; founders: { name: string; email: string }[] } | null>(null);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [view, setView] = useState<"month" | "agenda">("month");

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

  async function inviteAll() {
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/calendar/invite-all", { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setInviteResult({ invited: data.invited, events: data.events, founders: data.founders ?? [] });
      toast.success(`${data.invited} founders invitados a ${data.events} eventos`);
      load();
    } catch { toast.error("Error al invitar founders"); }
    finally { setInviting(false); }
  }

  useEffect(() => { load(); }, []);

  const icalUrl = calendarId
    ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`
    : null;
  const gcalUrl = calendarId
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`
    : "https://calendar.google.com";

  return (
    <div className="space-y-6">
      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Calendario del programa</h1>
          <p className="text-sm text-zinc-500 mt-1">Agenda de clases desde Google Calendar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={inviteAll} disabled={inviting}
            className="flex items-center gap-1.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invitar todos los inscritos
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-800 border border-zinc-200 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sync con Google Calendar
          </button>
          <a href={gcalUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors">
            <ExternalLink className="h-4 w-4" /> Abrir en Google Calendar
          </a>
        </div>
      </div>

      {/* Resultado invitación */}
      {inviteResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">
              {inviteResult.invited} founders invitados a {inviteResult.events} clases
            </p>
          </div>
          {inviteResult.founders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-7">
              {inviteResult.founders.map((f) => (
                <span key={f.email} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* iCal */}
      {icalUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-blue-800">Link de suscripción</p>
            <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
              <code className="text-xs text-zinc-700 flex-1 truncate">{icalUrl}</code>
              <CopyButton text={icalUrl} />
            </div>
          </div>
        </div>
      )}

      {!calendarId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <strong>GOOGLE_CALENDAR_ID</strong> no configurado. Ir a{" "}
            <a href="/admin/clases" className="underline font-medium">Clases</a> para crear el calendario.
          </p>
        </div>
      )}

      {/* Toggle de vista */}
      {!loading && !error && (
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          <button onClick={() => setView("month")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${view === "month" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
            <CalendarDays className="h-4 w-4" /> Mes
          </button>
          <button onClick={() => setView("agenda")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${view === "agenda" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
            <List className="h-4 w-4" /> Agenda
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando calendario...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Error al cargar el calendario</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            {(error.includes("scope") || error.includes("403")) && (
              <a href="/api/auth/gmail" target="_blank" className="text-xs text-red-600 font-semibold mt-2 underline inline-block">
                Re-autorizar Google →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Vistas */}
      {!loading && !error && view === "month" && (
        <MonthView events={events} onSelectEvent={setSelected} />
      )}
      {!loading && !error && view === "agenda" && (
        <AgendaView events={events} onSelectEvent={setSelected} />
      )}
    </div>
  );
}
