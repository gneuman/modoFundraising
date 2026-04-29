import { obtenerSesion } from "@/lib/auth";
import { getClasesWithContent, type MisionRecord, type ClaseRecord, type RecursoRecord } from "@/lib/airtable";
import { Target, Clock, BookOpen, CheckCircle2, Circle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function formatFecha(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function daysLeft(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function MisionCard({
  mision,
  clase,
}: {
  mision: MisionRecord;
  clase?: ClaseRecord & { misionesData: MisionRecord[]; recursosData: RecursoRecord[] };
}) {
  const days = daysLeft(mision.fecha_limite);
  const isActiva = mision.status === "Activa";
  const isCerrada = mision.status === "Cerrada";
  const isProxima = mision.status === "Próxima" || !mision.status;

  let urgencyBorder = "border-zinc-200";
  if (isActiva) {
    if (days !== null && days <= 2) urgencyBorder = "border-red-300";
    else urgencyBorder = "border-amber-300";
  }
  if (isCerrada) urgencyBorder = "border-zinc-200";

  return (
    <div className={`bg-white rounded-2xl border-2 ${urgencyBorder} overflow-hidden transition-all`}>
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {isCerrada
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : isActiva
                ? <AlertCircle className="h-5 w-5 text-amber-500" />
                : <Circle className="h-5 w-5 text-zinc-300" />}
            </div>
            <div>
              <h3 className={`font-bold leading-tight ${isCerrada ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                {mision.titulo}
              </h3>
              {clase && (
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Semana {clase.semana} — {clase.titulo}
                </p>
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

        {mision.descripcion && (
          <p className="text-sm text-zinc-500 leading-relaxed">{mision.descripcion}</p>
        )}

        {/* Instrucciones */}
        {mision.instrucciones && isActiva && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-zinc-700 whitespace-pre-line">
            <p className="font-semibold text-amber-800 text-xs uppercase tracking-wide mb-1">Instrucciones</p>
            {mision.instrucciones}
          </div>
        )}

        {/* Deadline */}
        {mision.fecha_limite && !isCerrada && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            days !== null && days <= 2 ? "text-red-600" :
            days !== null && days <= 5 ? "text-amber-600" :
            "text-zinc-500"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {isCerrada ? "Cerrada" : days === null ? "" :
              days < 0 ? "Vencida" :
              days === 0 ? "Vence hoy" :
              days === 1 ? "Vence mañana" :
              `${days} días restantes · ${formatFecha(mision.fecha_limite)}`}
          </div>
        )}
        {isCerrada && mision.fecha_limite && (
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Cerrada el {formatFecha(mision.fecha_limite)}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function MisionesPage() {
  const session = await obtenerSesion();
  const clases = await getClasesWithContent();

  // Flatten all missions with their parent class
  const allMisiones: { mision: MisionRecord; clase: (typeof clases)[0] }[] = [];
  for (const clase of clases) {
    for (const mision of clase.misionesData) {
      allMisiones.push({ mision, clase });
    }
  }

  // Sort: Activa first, then Próxima, then Cerrada
  const ORDER: Record<string, number> = { Activa: 0, Próxima: 1, Cerrada: 2 };
  allMisiones.sort((a, b) => {
    const oa = ORDER[a.mision.status ?? "Próxima"] ?? 1;
    const ob = ORDER[b.mision.status ?? "Próxima"] ?? 1;
    if (oa !== ob) return oa - ob;
    return (a.clase.semana ?? 0) - (b.clase.semana ?? 0);
  });

  const activas = allMisiones.filter((m) => m.mision.status === "Activa").length;
  const cerradas = allMisiones.filter((m) => m.mision.status === "Cerrada").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Misiones</h1>
        <p className="text-sm text-zinc-500 mt-1">Tareas semanales del programa</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{allMisiones.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600">Activas</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{activas}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">Completadas</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{cerradas}</p>
        </div>
      </div>

      {allMisiones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center">
          <Target className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400">Las misiones serán publicadas junto con las clases.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allMisiones.map(({ mision, clase }) => (
            <MisionCard key={mision.id} mision={mision} clase={clase} />
          ))}
        </div>
      )}
    </div>
  );
}
