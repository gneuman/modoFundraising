import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getClaseById, type MisionRecord, type RecursoRecord } from "@/lib/airtable";
import Link from "next/link";
import {
  ChevronLeft, Calendar, Target, FileText, Link2,
  Video, ExternalLink, Clock, AlertCircle, CheckCircle2, Circle, Wrench, BookOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatFecha(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// Detecta si es YouTube, Vimeo o iframe genérico y devuelve la URL embebible
function getEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const videoId = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}?color=2563eb&title=0&byline=0`;
    }
    // Loom
    if (u.hostname.includes("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return `https://www.loom.com/embed/${id}`;
    }
  } catch { /* fallback */ }
  return null;
}

function TipoIcon({ tipo }: { tipo?: string }) {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  if (t.includes("video")) return <Video className="h-4 w-4 text-blue-500" />;
  if (t.includes("template")) return <BookOpen className="h-4 w-4 text-purple-500" />;
  if (t.includes("herramienta")) return <Wrench className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-zinc-400" />;
}

function MisionBlock({ mision }: { mision: MisionRecord }) {
  const days = daysLeft(mision.fecha_limite);
  const isActiva = mision.status === "Activa";
  const isCerrada = mision.status === "Cerrada";

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      isCerrada ? "border-zinc-200 bg-white" :
      isActiva ? "border-amber-300 bg-amber-50/40" :
      "border-zinc-200 bg-white"
    }`}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {isCerrada ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : isActiva ? <AlertCircle className="h-5 w-5 text-amber-500" />
                : <Circle className="h-5 w-5 text-zinc-300" />}
            </div>
            <div>
              <h3 className={`font-bold text-lg leading-tight ${isCerrada ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                {mision.titulo}
              </h3>
              {mision.descripcion && (
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{mision.descripcion}</p>
              )}
            </div>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCerrada ? "bg-zinc-100 text-zinc-400" :
            isActiva ? "bg-amber-100 text-amber-700" :
            "bg-zinc-100 text-zinc-500"
          }`}>
            {mision.status ?? "Próxima"}
          </span>
        </div>

        {mision.instrucciones && (
          <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Instrucciones</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{mision.instrucciones}</p>
          </div>
        )}

        {mision.fecha_limite && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${
            days !== null && days <= 2 ? "text-red-600" :
            days !== null && days <= 5 ? "text-amber-600" :
            "text-zinc-500"
          }`}>
            <Clock className="h-4 w-4" />
            {isCerrada ? `Cerrada el ${formatFecha(mision.fecha_limite)}` :
              days === null ? "" :
              days < 0 ? "⚠️ Vencida" :
              days === 0 ? "⏰ Vence hoy" :
              days === 1 ? "⏰ Vence mañana" :
              `${days} días restantes — ${formatFecha(mision.fecha_limite)}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ClaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await obtenerSesion();

  const clase = await getClaseById(id);
  if (!clase) notFound();

  const embedUrl = getEmbedUrl(clase.url_grabacion);
  const isGrabada = clase.status === "Grabada";
  const isLive = clase.status === "En vivo";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/portal/clases"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Todas las clases
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-blue-600">{clase.semana ?? "–"}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isLive ? "bg-red-100 text-red-600" :
                isGrabada ? "bg-green-100 text-green-700" :
                "bg-zinc-100 text-zinc-600"
              }`}>
                {isLive ? "🔴 En vivo" : clase.status ?? "Próxima"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 leading-tight">{clase.titulo}</h1>
            {clase.fecha && (
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {formatFecha(clase.fecha)}
              </p>
            )}
          </div>
        </div>

        {clase.descripcion && (
          <p className="text-zinc-600 leading-relaxed">{clase.descripcion}</p>
        )}

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-2">
          {isLive && clase.url_live && (
            <a href={clase.url_live} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Video className="h-4 w-4" /> Entrar en vivo
            </a>
          )}
          {!isLive && clase.url_live && (
            <a href={clase.url_live} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-medium px-4 py-2 rounded-xl transition-colors text-sm">
              <Calendar className="h-4 w-4" /> Link de la clase
            </a>
          )}
          {clase.url_grabacion && (
            <a href={clase.url_grabacion} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-medium px-4 py-2 rounded-xl transition-colors text-sm">
              <ExternalLink className="h-4 w-4" /> Abrir en nueva pestaña
            </a>
          )}
        </div>
      </div>

      {/* Video player */}
      {isGrabada && (
        embedUrl ? (
          <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-black aspect-video">
            <iframe
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : clase.url_grabacion ? (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-center space-y-3">
            <Video className="h-10 w-10 text-zinc-300 mx-auto" />
            <p className="text-zinc-500 text-sm">El video no puede embeberse directamente.</p>
            <a href={clase.url_grabacion} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm">
              <Video className="h-4 w-4" /> Ver grabación
            </a>
          </div>
        ) : (
          <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-10 text-center text-zinc-400 text-sm">
            La grabación estará disponible próximamente.
          </div>
        )
      )}

      {!isGrabada && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-700">
          {isLive
            ? "Esta clase está en vivo ahora. Usa el botón de arriba para unirte."
            : "La grabación estará disponible después de la clase en vivo."}
        </div>
      )}

      {/* Misiones */}
      {clase.misionesData.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" /> Misión de esta clase
          </h2>
          {clase.misionesData.map((m) => (
            <MisionBlock key={m.id} mision={m} />
          ))}
        </div>
      )}

      {/* Recursos — solo cuando la clase ya pasó o fue grabada */}
      {(() => {
        const ahora = Date.now();
        const clasePaso = isGrabada || (clase.fecha ? new Date(clase.fecha).getTime() <= ahora : false);
        if (!clasePaso) return (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-400 text-center">
            Los recursos estarán disponibles el día de la clase.
          </div>
        );
        return null;
      })()}
      {clase.recursosData.filter((r) => !r.fecha_disponible || new Date(r.fecha_disponible).getTime() <= Date.now()).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-400" /> Recursos
          </h2>
          <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
            {clase.recursosData.filter((r) => !r.fecha_disponible || new Date(r.fecha_disponible).getTime() <= Date.now()).map((r) => (
              <a key={r.id} href={r.url ?? "#"} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors group">
                <TipoIcon tipo={r.tipo} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-800 group-hover:text-blue-600 transition-colors">{r.titulo}</p>
                  {r.descripcion && <p className="text-sm text-zinc-400 truncate">{r.descripcion}</p>}
                </div>
                {r.tipo && (
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">{r.tipo}</span>
                )}
                <ExternalLink className="h-4 w-4 text-zinc-300 group-hover:text-blue-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
