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
import { Target, CheckCircle2, Star } from "lucide-react";
import { NpsForm } from "@/components/portal/nps-form";
import { EntregaForm } from "@/components/portal/entrega-form";
import { MisionActivaCard } from "@/components/portal/mision-activa-card";
import { HistorialMisiones } from "@/components/portal/historial-misiones";
import { Markdown } from "@/components/portal/markdown";
import { formatFechaSinHora as formatFecha } from "@/lib/timezone";
import { isMisionEnCurso, isMisionTerminada } from "@/lib/mision-status";

export const dynamic = "force-dynamic";

function daysLeft(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// Visibilidad por fecha (WI-1632): David precarga todas las misiones al inicio.
// Para no leakear contenido futuro, una misión no terminada se muestra solo si
// (fecha_clase + dias_offset * 1día) <= ahora.
function isMisionVisible(
  mision: { status?: MisionRecord["status"]; dias_offset?: number },
  claseFecha: string | undefined,
  now: number,
): boolean {
  if (isMisionTerminada(mision.status)) return true;
  if (!claseFecha || mision.dias_offset === undefined) return true;
  const activeAt = new Date(claseFecha).getTime() + mision.dias_offset * 86_400_000;
  return activeAt <= now;
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
        <Markdown
          className={`!text-xs !space-y-1 ${
            submitted ? "!text-green-700/80" : "!text-blue-600"
          }`}
        >
          {tarea.descripcion}
        </Markdown>
      )}
      <NpsForm tarea={tarea} clases={clases} initialSubmitted={submitted} />
    </div>
  );
}

// Resuelve las clases (id + título) de una tarea NPS/Feedback a partir de sus
// `clases_nps`, y si la startup ya dejó feedback de TODAS ellas. Se calcula por
// tarea (no una vez por misión): una misión puede tener varias tareas Feedback,
// cada una apuntando a clases distintas. Antes se usaba el primer `.find()` para
// todas las tareas, así que dos formularios de feedback se veían idénticos.
function resolverClasesTarea(
  tarea: TareaRecord,
  claseById: Map<string, ClaseRecord & { recursosData: RecursoRecord[] }>,
  feedbackClaseIds: Set<string>,
): { clasesTitulos: { id: string; titulo: string }[]; submitted: boolean } {
  const clasesTitulos = (tarea.clases_nps ?? [])
    .map((id) => claseById.get(id))
    .filter(Boolean)
    .map((c) => ({ id: c!.id!, titulo: c!.titulo ?? "" }));
  const submitted =
    clasesTitulos.length > 0 &&
    clasesTitulos.every((c) => feedbackClaseIds.has(c.id));
  return { clasesTitulos, submitted };
}

// Formatea el label del deadline (misma lógica que antes, ahora en el header
// compacto del wrapper colapsable).
function deadlineLabel(fechaLimite: string | undefined, days: number | null): string | null {
  if (!fechaLimite) return null;
  if (days === null) return null;
  if (days < 0) return "Vencida";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `${days} días restantes · ${formatFecha(fechaLimite)}`;
}

// ¿La tarea cuenta como "hecha"? Entrega/Checklist → tiene consigna con
// contenido. NPS/Feedback → ya envió feedback de todas sus clases.
function tareaHecha(
  tarea: TareaRecord,
  claseById: Map<string, ClaseRecord & { recursosData: RecursoRecord[] }>,
  feedbackClaseIds: Set<string>,
  consignaPorTarea: Map<string, ConsignaRecord>,
): boolean {
  if (tarea.tipo === "NPS" || tarea.tipo === "Feedback") {
    const { clasesTitulos, submitted } = resolverClasesTarea(tarea, claseById, feedbackClaseIds);
    // Tareas de feedback sin clases resueltas no se renderizan → no cuentan.
    return clasesTitulos.length > 0 && submitted;
  }
  const c = tarea.id ? consignaPorTarea.get(tarea.id) : undefined;
  return Boolean(
    c &&
      ((c.contenido_texto && c.contenido_texto.trim()) ||
        (c.url_extra && c.url_extra.trim()) ||
        (c.adjuntos && c.adjuntos.length > 0)),
  );
}

function MisionActivaCardServer({
  mision,
  clase,
  claseById,
  feedbackClaseIds,
  consignaPorTarea,
  misionCompletada,
  defaultOpen,
}: {
  mision: MisionRecord & { tareasData: TareaRecord[] };
  clase: ClaseRecord & { recursosData: RecursoRecord[] };
  claseById: Map<string, ClaseRecord & { recursosData: RecursoRecord[] }>;
  feedbackClaseIds: Set<string>;
  consignaPorTarea: Map<string, ConsignaRecord>;
  misionCompletada: boolean;
  defaultOpen: boolean;
}) {
  const days = daysLeft(mision.fecha_limite);
  const isCompletada = misionCompletada;

  // Renderizar tareas respetando el `orden` del template (no agrupadas por tipo).
  const tareasOrdenadas = [...mision.tareasData].sort(
    (a, b) => (a.orden ?? 999) - (b.orden ?? 999),
  );

  // Solo cuentan (para "X/Y tareas") las que efectivamente se renderizan: las
  // Feedback sin clases resueltas se ocultan y no deben inflar el total.
  const tareasVisibles = tareasOrdenadas.filter((t) => {
    if (t.tipo === "NPS" || t.tipo === "Feedback") {
      return resolverClasesTarea(t, claseById, feedbackClaseIds).clasesTitulos.length > 0;
    }
    return true;
  });
  const completadasCount = tareasVisibles.filter((t) =>
    tareaHecha(t, claseById, feedbackClaseIds, consignaPorTarea),
  ).length;

  return (
    <MisionActivaCard
      titulo={mision.titulo ?? ""}
      semana={clase.semana}
      claseTitulo={clase.titulo}
      status={mision.status}
      fechaLimiteLabel={deadlineLabel(mision.fecha_limite, days)}
      days={days}
      isCompletada={isCompletada}
      tareasCount={tareasVisibles.length}
      completadasCount={completadasCount}
      defaultOpen={defaultOpen}
    >
      {mision.descripcion && (
        <Markdown className="!text-zinc-500">{mision.descripcion}</Markdown>
      )}

      {/* Tareas — renderizadas en el orden del template, sin agruparlas por tipo.
          Cualquiera puede completarse en desorden. */}
      {tareasOrdenadas.length > 0 && (
        <div className="space-y-3">
          {tareasOrdenadas.map((t) => {
            if (t.tipo === "NPS" || t.tipo === "Feedback") {
              const { clasesTitulos, submitted } = resolverClasesTarea(
                t,
                claseById,
                feedbackClaseIds,
              );
              if (clasesTitulos.length === 0) return null;
              return (
                <TareaNpsWrapper
                  key={t.id}
                  tarea={t}
                  clases={clasesTitulos}
                  submitted={submitted}
                />
              );
            }
            // WI-1661: Entrega y Checklist usan el mismo formulario (guardan
            // Consigna). El cliente pidió que TODAS las tareas se puedan
            // contestar sin importar el tipo.
            return (
              <EntregaForm
                key={t.id}
                tarea={t}
                initialConsigna={t.id ? consignaPorTarea.get(t.id) : undefined}
              />
            );
          })}
        </div>
      )}

      {isCompletada && (
        <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Todas las tareas completadas
        </p>
      )}
    </MisionActivaCard>
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
    // includeTest: true para que "Modo Foco - Test" (sandbox de Gabriel) tambien
    // resuelva startupId y sus consignas se muestren en la UI.
    getAllApplications({ includeTest: true }),
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
      // Whitelist sandbox: "Modo Foco - Test" acepta cualquier status.
      const isTestStartup = a.startup_name === "Modo Foco - Test";
      const isEnrolled = a.status === "Inscrita" || a.status === "Invitada institucional";
      if (!isEnrolled && !isTestStartup) return false;
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

  // Vista principal: TODAS las misiones Activas/Actuales como cards grandes,
  // ordenadas por semana descendente (la más reciente arriba).
  // Todas las demás Próximas ya se filtraron por WI-1632.
  const misionesActivas = allMisiones
    .filter((m) => isMisionEnCurso(m.mision.status))
    .sort((a, b) => (b.clase.semana ?? 0) - (a.clase.semana ?? 0));

  // Historial: las ya terminadas ("Termino" hoy, "Cerrada" en registros viejos).
  const misionesCerradas = allMisiones
    .filter((m) => isMisionTerminada(m.mision.status))
    .sort((a, b) => (b.clase.semana ?? 0) - (a.clase.semana ?? 0));

  // Stats
  const totalMisiones = allMisiones.length;
  const activasCount = allMisiones.filter((m) => isMisionEnCurso(m.mision.status)).length;
  const completadasCount = misionesCompletadas.filter((m) => m.completada).length;

  // Mapa clase por ID para NPS lookup
  const claseById = new Map(clases.map((c) => [c.id!, c]));

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

      {/* Misiones activas — una card colapsable por cada misión Activa/Actual.
          La primera (más reciente) arranca abierta; el resto colapsadas. */}
      {misionesActivas.length > 0 ? (
        <div className="space-y-6">
          {misionesActivas.map(({ mision, clase }, i) => (
            <MisionActivaCardServer
              key={mision.id ?? clase.id}
              mision={mision}
              clase={clase}
              claseById={claseById}
              feedbackClaseIds={feedbackClaseIds}
              consignaPorTarea={consignaPorTarea}
              misionCompletada={mision.id ? misionCompletadaMap.get(mision.id) ?? false : false}
              defaultOpen={i === 0}
            />
          ))}
        </div>
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
