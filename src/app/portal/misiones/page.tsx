import { obtenerSesion } from "@/lib/auth";
import {
  getClasesWithContentCached,
  getAllApplications,
  getAllFeedback,
  getConsignasByStartup,
  getMisionesCompletadasByStartup,
  type MisionRecord,
  type ClaseRecord,
  type RecursoRecord,
  type TareaRecord,
  type ConsignaRecord,
} from "@/lib/airtable";
import { Target, Clock, BookOpen, CheckCircle2, AlertCircle, Star, ListChecks, Link as LinkIcon, FileText, Video, Paperclip } from "lucide-react";
import { NpsForm } from "@/components/portal/nps-form";
import { EntregaForm } from "@/components/portal/entrega-form";
import { HistorialMisiones } from "@/components/portal/historial-misiones";
import { formatFechaSinHora as formatFecha } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function daysLeft(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// Visibilidad por fecha (WI-1632): David precarga todas las misiones al inicio.
// Para no leakear contenido futuro, una misión no-Cerrada se muestra solo si
// (fecha_clase + dias_offset * 1día) <= ahora.
function isMisionVisible(
  mision: { status?: string; dias_offset?: number },
  claseFecha: string | undefined,
  now: number,
): boolean {
  if (mision.status === "Cerrada") return true;
  if (!claseFecha || mision.dias_offset === undefined) return true;
  const activeAt = new Date(claseFecha).getTime() + mision.dias_offset * 86_400_000;
  return activeAt <= now;
}

// Recursos también respetan visibilidad por fecha
function isRecursoVisible(
  recurso: { fecha_disponible?: string; dias_offset?: number },
  claseFecha: string | undefined,
  now: number,
): boolean {
  if (recurso.fecha_disponible) {
    return new Date(recurso.fecha_disponible).getTime() <= now;
  }
  if (!claseFecha || recurso.dias_offset === undefined) return true;
  const activeAt = new Date(claseFecha).getTime() + recurso.dias_offset * 86_400_000;
  return activeAt <= now;
}

function RecursoIcon({ tipo }: { tipo?: string }) {
  const t = (tipo ?? "").toLowerCase();
  if (t.includes("video")) return <Video className="h-4 w-4 text-blue-500 shrink-0" />;
  if (t.includes("pdf") || t.includes("doc")) return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
  if (t.includes("link") || t.includes("url")) return <LinkIcon className="h-4 w-4 text-emerald-500 shrink-0" />;
  return <Paperclip className="h-4 w-4 text-zinc-400 shrink-0" />;
}

function Recursos({ recursos }: { recursos: RecursoRecord[] }) {
  if (recursos.length === 0) return null;
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Paperclip className="h-4 w-4 text-zinc-500" />
        <p className="text-sm font-semibold text-zinc-700">Recursos</p>
      </div>
      <ul className="space-y-1.5">
        {recursos.map((r) => (
          <li key={r.id} className="flex items-start gap-2">
            <RecursoIcon tipo={r.tipo} />
            <div className="flex-1 min-w-0">
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-700 hover:text-blue-600 hover:underline break-words"
                >
                  {r.titulo || r.url}
                </a>
              ) : (
                <p className="text-sm font-medium text-zinc-700">{r.titulo}</p>
              )}
              {r.descripcion && (
                <p className="text-xs text-zinc-500 mt-0.5">{r.descripcion}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TareaChecklistItem({ tarea }: { tarea: TareaRecord }) {
  // Checklist es informativo — no interactivo, no cuenta para completitud.
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <ListChecks className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700">{tarea.titulo}</p>
        {tarea.descripcion && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{tarea.descripcion}</p>
        )}
      </div>
    </div>
  );
}

function TareaNpsWrapper({
  tarea,
  clases,
  submitted,
}: {
  tarea: TareaRecord;
  clases: { id: string; titulo: string }[];
  submitted: boolean;
}) {
  return (
    <div className={`border rounded-xl p-4 space-y-3 ${submitted ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center gap-2">
        {submitted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Star className="h-4 w-4 text-blue-500" />}
        <p className={`text-sm font-semibold ${submitted ? "text-green-800" : "text-blue-800"}`}>{tarea.titulo}</p>
      </div>
      {tarea.descripcion && (
        <p className={`text-xs ${submitted ? "text-green-700/80" : "text-blue-600"}`}>{tarea.descripcion}</p>
      )}
      <NpsForm tarea={tarea} clases={clases} initialSubmitted={submitted} />
    </div>
  );
}

function MisionActivaCard({
  mision,
  clase,
  clasesTitulos,
  npsSubmitted,
  consignaPorTarea,
  misionCompletada,
  now,
}: {
  mision: MisionRecord & { tareasData: TareaRecord[] };
  clase: ClaseRecord & { recursosData: RecursoRecord[] };
  clasesTitulos: { id: string; titulo: string }[];
  npsSubmitted: boolean;
  consignaPorTarea: Map<string, ConsignaRecord>;
  misionCompletada: boolean;
  now: number;
}) {
  const days = daysLeft(mision.fecha_limite);
  const isCompletada = misionCompletada;

  const border = isCompletada
    ? "border-green-300"
    : days !== null && days <= 2
    ? "border-red-300"
    : "border-amber-300";

  const tareaNps = mision.tareasData.find((t) => t.tipo === "NPS");
  const tareasEntrega = mision.tareasData.filter((t) => t.tipo === "Entrega");
  const tareasChecklist = mision.tareasData.filter((t) => t.tipo === "Checklist");

  const recursosVisibles = clase.recursosData.filter((r) =>
    isRecursoVisible(r, clase.fecha, now),
  );

  return (
    <div className={`bg-white rounded-2xl border-2 ${border} overflow-hidden transition-all`}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {isCompletada ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className={`font-bold text-lg leading-tight ${isCompletada ? "text-green-800" : "text-zinc-800"}`}>
                {mision.titulo}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Semana {clase.semana} — {clase.titulo}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isCompletada ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompletada ? "Completada" : mision.status ?? "Activa"}
          </span>
        </div>

        {mision.descripcion && (
          <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-wrap">{mision.descripcion}</p>
        )}

        {/* Recursos add-on */}
        <Recursos recursos={recursosVisibles} />

        {/* Tareas */}
        {mision.tareasData.length > 0 && (
          <div className="space-y-3">
            {/* NPS primero */}
            {tareaNps && clasesTitulos.length > 0 && (
              <TareaNpsWrapper tarea={tareaNps} clases={clasesTitulos} submitted={npsSubmitted} />
            )}

            {/* Entregas */}
            {tareasEntrega.map((t) => (
              <EntregaForm
                key={t.id}
                tarea={t}
                initialConsigna={t.id ? consignaPorTarea.get(t.id) : undefined}
              />
            ))}

            {/* Checklist decorativo */}
            {tareasChecklist.length > 0 && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 divide-y divide-zinc-100">
                {tareasChecklist.map((t) => (
                  <TareaChecklistItem key={t.id} tarea={t} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deadline */}
        {mision.fecha_limite && !isCompletada && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              days !== null && days <= 2
                ? "text-red-600"
                : days !== null && days <= 5
                ? "text-amber-600"
                : "text-zinc-500"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {days === null
              ? ""
              : days < 0
              ? "Vencida"
              : days === 0
              ? "Vence hoy"
              : days === 1
              ? "Vence mañana"
              : `${days} días restantes · ${formatFecha(mision.fecha_limite)}`}
          </div>
        )}
        {isCompletada && (
          <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Todas las tareas completadas
          </p>
        )}
      </div>
    </div>
  );
}

export default async function MisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await obtenerSesion();
  const [clases, allFeedback, apps, params] = await Promise.all([
    getClasesWithContentCached(),
    getAllFeedback(),
    getAllApplications(),
    searchParams,
  ]);

  // Encontrar startupId:
  //   - Admin con ?as=recXXX en la URL: usa esa startup para testear
  //   - Founder / admin sin ?as: busca su propia startup por email
  //     (matchea contra todos los cofounders, no solo el principal)
  let startupId: string | undefined;
  let impersonating = false;
  if (session?.role === "admin" && params.as) {
    startupId = params.as;
    impersonating = true;
  } else if (session?.email) {
    const emailLower = session.email.toLowerCase();
    const app = apps.find((a) => {
      const isEnrolled = a.status === "Inscrita" || a.status === "Invitada institucional";
      if (!isEnrolled) return false;
      const allEmails = [a.email, ...(a.all_founder_emails ?? [])]
        .filter(Boolean)
        .map((e) => e!.toLowerCase());
      return allEmails.includes(emailLower);
    });
    startupId = app?.startup_record?.[0] as string | undefined;
  }

  // Prefetch consignas + misiones completadas de esta startup
  const [consignas, misionesCompletadas] = await Promise.all([
    startupId ? getConsignasByStartup(startupId) : Promise.resolve([]),
    startupId ? getMisionesCompletadasByStartup(startupId) : Promise.resolve([]),
  ]);

  // Mapas de lookup
  const consignaPorTarea = new Map<string, ConsignaRecord>();
  for (const c of consignas) {
    const tid = c.tarea?.[0];
    if (tid) consignaPorTarea.set(tid, c);
  }
  const misionCompletadaMap = new Map<string, boolean>();
  for (const mc of misionesCompletadas) {
    const mid = mc.mision_record?.[0];
    if (mid) misionCompletadaMap.set(mid, !!mc.completada);
  }

  // Set de claseIds con NPS ya enviado por esta startup
  const feedbackClaseIds = new Set(
    allFeedback
      .filter((f) => startupId && f.startup_record?.includes(startupId))
      .flatMap((f) => f.clase_record ?? []),
  );

  // Flatten misiones visibles con su clase padre
  const allMisiones: {
    mision: MisionRecord & { tareasData: TareaRecord[] };
    clase: (typeof clases)[0];
  }[] = [];

  const now = Date.now();
  for (const clase of clases) {
    for (const mision of clase.misionesData) {
      const visible = isMisionVisible(mision, clase.fecha, now);
      if (visible) allMisiones.push({ mision, clase });
    }
  }

  // Filtro de la vista principal: solo la Activa/Actual como card grande.
  // Todas las demás Próximas ya se filtraron por WI-1632.
  const misionActiva = allMisiones.find(
    (m) => m.mision.status === "Activa" || m.mision.status === "Actual",
  );

  // Historial: solo las Cerradas
  const misionesCerradas = allMisiones
    .filter((m) => m.mision.status === "Cerrada")
    .sort((a, b) => (b.clase.semana ?? 0) - (a.clase.semana ?? 0));

  // Stats
  const totalMisiones = allMisiones.length;
  const activasCount = allMisiones.filter(
    (m) => m.mision.status === "Activa" || m.mision.status === "Actual",
  ).length;
  const completadasCount = misionesCompletadas.filter((m) => m.completada).length;

  // Mapa clase por ID para NPS lookup
  const claseById = new Map(clases.map((c) => [c.id!, c]));

  // Datos para el NPS de la misión activa
  let npsSubmitted = false;
  let clasesTitulos: { id: string; titulo: string }[] = [];
  if (misionActiva) {
    const tareaNps = misionActiva.mision.tareasData.find((t) => t.tipo === "NPS");
    clasesTitulos = (tareaNps?.clases_nps ?? [])
      .map((id) => claseById.get(id))
      .filter(Boolean)
      .map((c) => ({ id: c!.id!, titulo: c!.titulo ?? "" }));
    npsSubmitted =
      clasesTitulos.length > 0 &&
      clasesTitulos.every((c) => feedbackClaseIds.has(c.id));
  }

  const misionActivaCompletada = misionActiva?.mision.id
    ? misionCompletadaMap.get(misionActiva.mision.id) ?? false
    : false;

  return (
    <div className="space-y-6">
      {impersonating && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 text-sm text-purple-800">
          <strong>Modo admin:</strong> viendo el portal como startup <code className="bg-purple-100 px-1 rounded text-xs">{startupId}</code>. Las respuestas que envies se guardaran para esta startup.
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Misiones</h1>
        <p className="text-sm text-zinc-500 mt-1">Tareas semanales del programa</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{totalMisiones}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600">Activas</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{activasCount}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">Completadas</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{completadasCount}</p>
        </div>
      </div>

      {/* Misión activa */}
      {misionActiva ? (
        <MisionActivaCard
          mision={misionActiva.mision}
          clase={misionActiva.clase}
          clasesTitulos={clasesTitulos}
          npsSubmitted={npsSubmitted}
          consignaPorTarea={consignaPorTarea}
          misionCompletada={misionActivaCompletada}
          now={now}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center">
          <Target className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400">No hay misión activa en este momento.</p>
          <p className="text-xs text-zinc-300 mt-1">Las próximas misiones aparecerán aquí al activarse.</p>
        </div>
      )}

      {/* Historial de misiones cerradas */}
      <HistorialMisiones
        misiones={misionesCerradas.map(({ mision, clase }) => {
          const mcId = mision.id ? misionesCompletadas.find((mc) => mc.mision_record?.[0] === mision.id) : undefined;
          return {
            id: mision.id ?? clase.id ?? "",
            titulo: mision.titulo ?? "",
            semana: clase.semana,
            fecha_limite: mision.fecha_limite,
            fecha_completada: mcId?.fecha_completada,
            completada: mcId?.completada ?? false,
          };
        })}
      />
    </div>
  );
}
