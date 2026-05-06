import { obtenerSesion } from "@/lib/auth";
import {
  getClasesWithContent,
  getAllApplications,
  getAllFeedback,
  type MisionRecord,
  type ClaseRecord,
  type RecursoRecord,
  type TareaRecord,
} from "@/lib/airtable";
import { Target, Clock, BookOpen, CheckCircle2, Circle, AlertCircle, Star, FileCheck, ListChecks } from "lucide-react";
import { NpsForm } from "@/components/portal/nps-form";
import { formatFechaSinHora as formatFecha } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function daysLeft(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function TipoIcon({ tipo }: { tipo?: string }) {
  if (tipo === "NPS") return <Star className="h-4 w-4 text-blue-500 shrink-0" />;
  if (tipo === "Entrega") return <FileCheck className="h-4 w-4 text-amber-500 shrink-0" />;
  return <ListChecks className="h-4 w-4 text-zinc-400 shrink-0" />;
}

function TareaNps({
  tarea,
  clases,
  submitted,
}: {
  tarea: TareaRecord;
  clases: { id: string; titulo: string }[];
  submitted: boolean;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-semibold text-blue-800">{tarea.titulo}</p>
      </div>
      {tarea.descripcion && (
        <p className="text-xs text-blue-600">{tarea.descripcion}</p>
      )}
      <NpsForm tarea={tarea} clases={clases} initialSubmitted={submitted} />
    </div>
  );
}

function TareaItem({ tarea }: { tarea: TareaRecord }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <TipoIcon tipo={tarea.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700">{tarea.titulo}</p>
        {tarea.descripcion && (
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{tarea.descripcion}</p>
        )}
      </div>
      <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">
        {tarea.tipo}
      </span>
    </div>
  );
}

function MisionCard({
  mision,
  clase,
  clasesTitulos,
  feedbackSubmitted,
}: {
  mision: MisionRecord & { tareasData: TareaRecord[] };
  clase?: ClaseRecord & { misionesData: (MisionRecord & { tareasData: TareaRecord[] })[]; recursosData: RecursoRecord[] };
  clasesTitulos: { id: string; titulo: string }[];
  feedbackSubmitted: boolean;
}) {
  const days = daysLeft(mision.fecha_limite);
  const isActiva = mision.status === "Activa";
  const isCerrada = mision.status === "Cerrada";

  let urgencyBorder = "border-zinc-200";
  if (isActiva) {
    urgencyBorder = days !== null && days <= 2 ? "border-red-300" : "border-amber-300";
  }

  const tareasSinNps = mision.tareasData.filter((t) => t.tipo !== "NPS");
  const tareaNps = mision.tareasData.find((t) => t.tipo === "NPS");

  return (
    <div className={`bg-white rounded-2xl border-2 ${urgencyBorder} overflow-hidden transition-all`}>
      <div className="p-5 space-y-4">
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

        {/* Tareas — solo cuando está activa o cerrada */}
        {(isActiva || isCerrada) && mision.tareasData.length > 0 && (
          <div className="space-y-3">
            {/* Tarea NPS primero */}
            {tareaNps && clasesTitulos.length > 0 && (
              <TareaNps
                tarea={tareaNps}
                clases={clasesTitulos}
                submitted={feedbackSubmitted}
              />
            )}

            {/* Resto de tareas */}
            {tareasSinNps.length > 0 && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 px-4 divide-y divide-zinc-100">
                {tareasSinNps.map((t) => (
                  <TareaItem key={t.id} tarea={t} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Próxima: preview de tareas */}
        {!isActiva && !isCerrada && mision.tareasData.length > 0 && (
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            {mision.tareasData.length} tareas · disponibles cuando la misión esté activa
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
            {days === null ? "" :
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
  const [clases, allFeedback, apps] = await Promise.all([
    getClasesWithContent(),
    getAllFeedback(),
    getAllApplications(),
  ]);

  // Encontrar startupId del founder
  const app = apps.find(
    (a) =>
      a.email === session?.email &&
      (a.status === "Inscrita" || a.status === "Invitada institucional")
  );
  const startupId = app?.startup_record?.[0] as string | undefined;

  // Set de claseIds con feedback ya enviado por esta startup
  const feedbackClaseIds = new Set(
    allFeedback
      .filter((f) => startupId && f.startup_record?.includes(startupId))
      .flatMap((f) => f.clase_record ?? [])
  );

  // Flatten misiones con su clase padre
  const allMisiones: {
    mision: MisionRecord & { tareasData: TareaRecord[] };
    clase: (typeof clases)[0];
  }[] = [];

  for (const clase of clases) {
    for (const mision of clase.misionesData) {
      allMisiones.push({ mision, clase });
    }
  }

  // Ordenar: Activa → Próxima → Cerrada
  const ORDER: Record<string, number> = { Activa: 0, Próxima: 1, Cerrada: 2 };
  allMisiones.sort((a, b) => {
    const oa = ORDER[a.mision.status ?? "Próxima"] ?? 1;
    const ob = ORDER[b.mision.status ?? "Próxima"] ?? 1;
    if (oa !== ob) return oa - ob;
    return (a.clase.semana ?? 0) - (b.clase.semana ?? 0);
  });

  const activas = allMisiones.filter((m) => m.mision.status === "Activa").length;
  const cerradas = allMisiones.filter((m) => m.mision.status === "Cerrada").length;

  // Mapa de clases por ID para lookup rápido
  const claseById = new Map(clases.map((c) => [c.id!, c]));

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
          {allMisiones.map(({ mision, clase }) => {
            const tareaNps = mision.tareasData.find((t) => t.tipo === "NPS");
            const clasesTitulos = (tareaNps?.clases_nps ?? [])
              .map((id) => claseById.get(id))
              .filter(Boolean)
              .map((c) => ({ id: c!.id!, titulo: c!.titulo ?? "" }));

            const feedbackSubmitted =
              clasesTitulos.length > 0 &&
              clasesTitulos.every((c) => feedbackClaseIds.has(c.id));

            return (
              <MisionCard
                key={mision.id}
                mision={mision}
                clase={clase}
                clasesTitulos={clasesTitulos}
                feedbackSubmitted={feedbackSubmitted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
