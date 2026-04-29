import { obtenerSesionDeHeaders as obtenerSesion } from "@/lib/auth";
import { getClasesWithContent, type ClaseRecord, type MisionRecord, type RecursoRecord } from "@/lib/airtable";
import { Video, Calendar, Play, BookOpen, Target, FileText, Link2, Wrench, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatFecha(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function formatFechaCorta(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function TipoIcon({ tipo }: { tipo?: string }) {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-500" />;
  if (t.includes("video")) return <Video className="h-3.5 w-3.5 text-blue-500" />;
  if (t.includes("template")) return <BookOpen className="h-3.5 w-3.5 text-purple-500" />;
  if (t.includes("herramienta")) return <Wrench className="h-3.5 w-3.5 text-orange-500" />;
  return <Link2 className="h-3.5 w-3.5 text-zinc-400" />;
}

type ClaseFull = ClaseRecord & { misionesData: MisionRecord[]; recursosData: RecursoRecord[] };

function ClaseRow({ clase }: { clase: ClaseFull }) {
  const isGrabada = clase.status === "Grabada";
  const isLive = clase.status === "En vivo";
  const isProxima = !isGrabada && !isLive;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Main row */}
      <Link href={`/portal/clases/${clase.id}`}
        className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/70 transition-colors group">
        {/* Week bubble */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm
          ${isGrabada ? "bg-green-50 text-green-700" : isLive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
          {clase.semana ?? "–"}
        </div>

        {/* Title + date */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors leading-tight truncate">
            {clase.titulo ?? "Clase sin título"}
          </p>
          {clase.fecha && (
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatFecha(clase.fecha)}
            </p>
          )}
        </div>

        {/* Status + action */}
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
              🔴 En vivo
            </span>
          )}
          {isGrabada && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Grabada
            </span>
          )}
          {isProxima && (
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Próxima</span>
          )}

          {isLive && clase.url_live && (
            <a href={clase.url_live} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Play className="h-3 w-3" /> Entrar
            </a>
          )}
          {isGrabada && clase.url_grabacion && (
            <a href={clase.url_grabacion} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Video className="h-3 w-3" /> Ver
            </a>
          )}
        </div>
      </Link>

      {/* Misión inline */}
      {clase.misionesData.length > 0 && clase.misionesData.map((mision) => {
        const days = daysLeft(mision.fecha_limite);
        const isActiva = mision.status === "Activa";
        const isCerrada = mision.status === "Cerrada";
        return (
          <div key={mision.id} className={`border-t px-5 py-3 flex items-start gap-3
            ${isActiva ? "bg-amber-50/60 border-amber-100" : "bg-zinc-50/50 border-zinc-100"}`}>
            <Target className={`h-4 w-4 mt-0.5 shrink-0 ${isActiva ? "text-amber-500" : "text-zinc-300"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight ${isCerrada ? "line-through text-zinc-400" : "text-zinc-700"}`}>
                {mision.titulo}
              </p>
              {mision.descripcion && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{mision.descripcion}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {mision.fecha_limite && !isCerrada && (
                <span className={`flex items-center gap-1 text-xs font-medium
                  ${days !== null && days <= 2 ? "text-red-600" : days !== null && days <= 5 ? "text-amber-600" : "text-zinc-400"}`}>
                  <Clock className="h-3 w-3" />
                  {days === null ? "" : days < 0 ? "Vencida" : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days}d — ${formatFechaCorta(mision.fecha_limite)}`}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${isCerrada ? "bg-zinc-100 text-zinc-400" : isActiva ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
                {mision.status ?? "Próxima"}
              </span>
            </div>
          </div>
        );
      })}

      {/* Recursos inline — solo visibles si la clase pasó o está grabada */}
      {(() => {
        const ahora = Date.now();
        const clasePaso = isGrabada || (clase.fecha ? new Date(clase.fecha).getTime() <= ahora : false);
        const recursosVisibles = clase.recursosData.filter((r) =>
          !r.fecha_disponible || new Date(r.fecha_disponible).getTime() <= ahora
        );
        if (!clasePaso || recursosVisibles.length === 0) return null;
        return (
          <div className="border-t border-zinc-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium">Recursos:</span>
            {recursosVisibles.map((r) => (
              <a key={r.id} href={r.url ?? "#"} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition-colors">
                <TipoIcon tipo={r.tipo} />
                <span className="truncate max-w-[140px]">{r.titulo}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
              </a>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export default async function ClasesPage() {
  const session = await obtenerSesion();
  const clases = await getClasesWithContent();

  const grabadas = clases.filter((c) => c.status === "Grabada").length;
  const proxima = clases.find((c) => c.status === "Próxima" || c.status === "En vivo");
  const misionesActivas = clases.flatMap((c) => c.misionesData).filter((m) => m.status === "Activa").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Clases</h1>
        <p className="text-sm text-zinc-500 mt-1">Programa completo de Modo Fundraising 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-xl font-bold text-zinc-800 mt-0.5">{clases.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Grabaciones</p>
          <p className="text-xl font-bold text-green-600 mt-0.5">{grabadas}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Misiones activas</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{misionesActivas}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-3">
          <p className="text-xs text-zinc-500">Próxima</p>
          <p className="text-xs font-semibold text-blue-600 mt-0.5 leading-tight">
            {proxima ? `S${proxima.semana} — ${proxima.titulo}` : "Por definir"}
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
            <ClaseRow key={clase.id} clase={clase} />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          Las clases son en vivo por Zoom. ¿Preguntas?{" "}
          <a href="mailto:hello@impacta.vc" className="underline font-medium">hello@impacta.vc</a>
        </p>
      </div>
    </div>
  );
}
