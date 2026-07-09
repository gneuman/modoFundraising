import Link from "next/link";
import { getClasesWithContentCached, type RecursoRecord } from "@/lib/airtable";
import { FileText, Video, Wrench, BookOpen, Link2, ExternalLink } from "lucide-react";
import { formatFechaConAnio as formatFecha } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function stripSemanaPrefix(titulo?: string): string | undefined {
  if (!titulo) return titulo;
  return titulo.replace(/^S\d+\s*[—–-]\s*/, "");
}

// Un recurso puede ser un link manual (campo url) o un archivo subido
// (PDF en Attachments). Preferimos el url manual; si no hay, usamos el
// primer attachment. Sin esto, los PDF subidos quedan sin href y no descargan.
function resolveRecursoUrl(r: RecursoRecord): string | undefined {
  return r.url ?? r.Attachments?.[0]?.url;
}

function TipoIcon({ tipo }: { tipo?: string }) {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  if (t.includes("video")) return <Video className="h-4 w-4 text-blue-500" />;
  if (t.includes("template")) return <BookOpen className="h-4 w-4 text-purple-500" />;
  if (t.includes("herramienta")) return <Wrench className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-zinc-400" />;
}

function RecursoRow({ r }: { r: RecursoRecord }) {
  const href = resolveRecursoUrl(r);
  return (
    <a href={href ?? "#"} target="_blank" rel="noreferrer"
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
  );
}

export default async function RecursosPage() {
  const clases = await getClasesWithContentCached();
  const clasesConRecursos = clases.filter((c) => c.recursosData.length > 0);
  const total = clasesConRecursos.reduce((acc, c) => acc + c.recursosData.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Recursos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Todos los materiales del programa, agrupados por clase
        </p>
      </div>

      {clasesConRecursos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-zinc-400">
          Los recursos serán publicados próximamente.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <p className="text-xs text-zinc-500">Total recursos</p>
              <p className="text-xl font-bold text-zinc-800 mt-0.5">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <p className="text-xs text-zinc-500">Clases con material</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{clasesConRecursos.length}</p>
            </div>
          </div>

          <div className="space-y-6">
            {clasesConRecursos.map((clase) => (
              <div key={clase.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/portal/clases/${clase.id}`}
                    className="group inline-flex items-baseline gap-2 min-w-0">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                      {clase.titulo?.match(/^S(\d+)/)?.[1] ?? clase.semana ?? "–"}
                    </span>
                    <h2 className="text-base font-bold text-zinc-800 group-hover:text-blue-700 transition-colors truncate">
                      {stripSemanaPrefix(clase.titulo)}
                    </h2>
                  </Link>
                  {clase.fecha && (
                    <span className="text-xs text-zinc-400 shrink-0">{formatFecha(clase.fecha)}</span>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                  {clase.recursosData.map((r) => <RecursoRow key={r.id} r={r} />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
