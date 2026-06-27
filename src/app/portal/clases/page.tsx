import { obtenerSesion } from "@/lib/auth";
import { getClasesWithContentCached } from "@/lib/airtable";
import { Calendar, ExternalLink } from "lucide-react";
import { ClaseCard } from "@/components/clases/clase-card";

export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  await obtenerSesion();
  const clases = await getClasesWithContentCached();

  const grabadas = clases.filter((c) => c.status === "Grabada").length;
  const proxima = clases.find(
    (c) => c.status === "Próxima" || c.status === "En vivo",
  );
  const misionesActivas = clases
    .flatMap((c) => c.misionesData)
    .filter((m) => m.status === "Activa").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Clases</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Programa completo de Modo Fundraising 2026
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-xl font-bold text-zinc-800 mt-0.5">
            {clases.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Grabaciones</p>
          <p className="text-xl font-bold text-green-600 mt-0.5">{grabadas}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Misiones activas</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">
            {misionesActivas}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Próxima</p>
          <p className="text-xs font-semibold text-blue-600 mt-0.5 leading-tight">
            {proxima ? proxima.titulo : "Por definir"}
          </p>
        </div>
      </div>

      {/* Lista de clases */}
      {clases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-zinc-400">
          Las clases serán publicadas próximamente.
        </div>
      ) : (
        <div className="space-y-2">
          {clases.map((clase) => (
            <ClaseCard key={clase.id} clase={clase} mode="view" />
          ))}
        </div>
      )}

      {/* Agregar al calendario */}
      {process.env.GOOGLE_CALENDAR_ID && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-blue-800">
              Agrega todas las clases a tu agenda
            </p>
            <p className="text-xs text-blue-600">
              Agrega el calendario del programa a Google Calendar, Apple
              Calendar o cualquier app de agenda.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                <Calendar className="h-3.5 w-3.5" /> Agregar a Google Calendar
              </a>
              <a
                href={`https://calendar.google.com/calendar/ical/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}/public/basic.ics`}
                className="inline-flex items-center gap-1.5 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Descargar .ics (Apple /
                Outlook)
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <p className="text-sm text-zinc-600">
          Las clases son en vivo por Streamyard. ¿Preguntas?{" "}
          <a
            href="mailto:admin@impacta.vc"
            className="underline font-medium text-zinc-700"
          >
            admin@impacta.vc
          </a>
        </p>
      </div>
    </div>
  );
}
