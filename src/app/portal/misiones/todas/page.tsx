import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { verificarTokenDia } from "@/lib/late-token";
import {
  getClasesWithContentCached,
  getAllApplications,
  getAllFeedback,
  getConsignasByStartup,
  getMisionesCompletadasByStartup,
  type MisionRecord,
  type ClaseRecord,
  type TareaRecord,
  type ConsignaRecord,
} from "@/lib/airtable";
import { BookOpen, CheckCircle2, AlertCircle, Star, Clock } from "lucide-react";
import { NpsForm } from "@/components/portal/nps-form";
import { EntregaForm } from "@/components/portal/entrega-form";
import { Markdown } from "@/components/portal/markdown";

export const dynamic = "force-dynamic";

// Vista "ponerse al día" (OP-1905): muestra TODAS las misiones contestables,
// no solo la Activa. Se abre con el link admin del día (?t=<token>). Lo que el
// founder envía por aquí se marca como entrega tardía en el backend (el token
// viaja en cada form). Sin token válido, redirige a la vista normal.

function MisionCard({
  mision,
  clase,
  clasesTitulos,
  npsSubmitted,
  consignaPorTarea,
  completada,
}: {
  mision: MisionRecord & { tareasData: TareaRecord[] };
  clase: ClaseRecord;
  clasesTitulos: { id: string; titulo: string }[];
  npsSubmitted: boolean;
  consignaPorTarea: Map<string, ConsignaRecord>;
  completada: boolean;
}) {
  const tareasOrdenadas = [...mision.tareasData].sort(
    (a, b) => (a.orden ?? 999) - (b.orden ?? 999),
  );
  const border = completada ? "border-green-300" : "border-amber-300";

  return (
    <div className={`bg-white rounded-2xl border-2 ${border} overflow-hidden`}>
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {completada ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className={`font-bold text-lg leading-tight ${completada ? "text-green-800" : "text-zinc-800"}`}>
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
              completada ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {completada ? "Completada" : mision.status ?? "Pendiente"}
          </span>
        </div>

        {mision.descripcion && (
          <Markdown className="!text-zinc-500">{mision.descripcion}</Markdown>
        )}

        {tareasOrdenadas.length > 0 && (
          <div className="space-y-3">
            {tareasOrdenadas.map((t) => {
              if (t.tipo === "NPS" || t.tipo === "Feedback") {
                if (clasesTitulos.length === 0) return null;
                return (
                  <div
                    key={t.id}
                    className={`border rounded-xl p-4 space-y-3 ${npsSubmitted ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      {npsSubmitted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Star className="h-4 w-4 text-blue-500" />
                      )}
                      <p className={`text-sm font-semibold ${npsSubmitted ? "text-green-800" : "text-blue-800"}`}>
                        {t.titulo}
                      </p>
                    </div>
                    {t.descripcion && (
                      <Markdown className={`!text-xs !space-y-1 ${npsSubmitted ? "!text-green-700/80" : "!text-blue-600"}`}>
                        {t.descripcion}
                      </Markdown>
                    )}
                    <NpsForm tarea={t} clases={clasesTitulos} initialSubmitted={npsSubmitted} />
                  </div>
                );
              }
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

        {mision.fecha_limite && !completada && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            Fecha límite original: {mision.fecha_limite.slice(0, 10)}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function MisionesTodasPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; as?: string }>;
}) {
  const params = await searchParams;

  // El token del día es la llave de esta vista. Sin token válido de HOY, no se
  // muestra el catálogo completo — se manda a la vista normal de misiones.
  const dia = await verificarTokenDia(params.t);
  if (!dia) redirect("/portal/misiones");

  const session = await obtenerSesion();
  const [clases, allFeedback, apps] = await Promise.all([
    getClasesWithContentCached(),
    getAllFeedback(),
    getAllApplications({ includeTest: true }),
  ]);

  // Startup: admin con ?as= usa esa; founder busca la suya por email (incluye
  // cofounders). Mismo criterio que la vista principal.
  let startupId: string | undefined;
  if (session?.role === "admin" && params.as) {
    startupId = params.as;
  } else if (session?.email) {
    const emailLower = session.email.toLowerCase();
    const app = apps.find((a) => {
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

  const [consignas, misionesCompletadas] = await Promise.all([
    startupId ? getConsignasByStartup(startupId) : Promise.resolve([]),
    startupId ? getMisionesCompletadasByStartup(startupId) : Promise.resolve([]),
  ]);

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
  const feedbackClaseIds = new Set(
    allFeedback
      .filter((f) => startupId && f.startup_record?.includes(startupId))
      .flatMap((f) => f.clase_record ?? []),
  );
  const claseById = new Map(clases.map((c) => [c.id!, c]));

  // TODAS las misiones (sin filtro de fecha), ordenadas por semana.
  const todas: {
    mision: MisionRecord & { tareasData: TareaRecord[] };
    clase: (typeof clases)[0];
  }[] = [];
  for (const clase of clases) {
    for (const mision of clase.misionesData) {
      todas.push({ mision, clase });
    }
  }
  todas.sort((a, b) => (a.clase.semana ?? 0) - (b.clase.semana ?? 0));

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">Ponte al día con tus misiones</p>
        <p className="text-xs text-amber-700 mt-1">
          Aquí puedes contestar todas las misiones del programa. Como este acceso
          es fuera de la fecha original, lo que envíes quedará registrado como
          <strong> entrega tardía</strong>. Este enlace es válido solo por hoy.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Todas las misiones</h1>
        <p className="text-sm text-zinc-500 mt-1">{todas.length} misiones del programa</p>
      </div>

      {!startupId && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center text-sm text-zinc-500">
          No encontramos tu startup. Inicia sesión con el correo con el que te
          registraste al programa.
        </div>
      )}

      {startupId &&
        todas.map(({ mision, clase }) => {
          const tareaNps = mision.tareasData.find(
            (t) => t.tipo === "NPS" || t.tipo === "Feedback",
          );
          const clasesTitulos = (tareaNps?.clases_nps ?? [])
            .map((id) => claseById.get(id))
            .filter(Boolean)
            .map((c) => ({ id: c!.id!, titulo: c!.titulo ?? "" }));
          const npsSubmitted =
            clasesTitulos.length > 0 &&
            clasesTitulos.every((c) => feedbackClaseIds.has(c.id));
          const completada = mision.id
            ? misionCompletadaMap.get(mision.id) ?? false
            : false;

          return (
            <MisionCard
              key={mision.id ?? clase.id}
              mision={mision}
              clase={clase}
              clasesTitulos={clasesTitulos}
              npsSubmitted={npsSubmitted}
              consignaPorTarea={consignaPorTarea}
              completada={completada}
            />
          );
        })}
    </div>
  );
}
