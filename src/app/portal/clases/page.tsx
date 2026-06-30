import { obtenerSesion } from "@/lib/auth";
import { getClasesWithContentCached } from "@/lib/airtable";
import { ClaseCard } from "@/components/clases/clase-card";

export const dynamic = "force-dynamic";

// Quita "Sx — " del titulo para mostrar al founder en mobile sin cortar texto.
function stripSemanaPrefix(titulo?: string): string | undefined {
  if (!titulo) return titulo;
  return titulo.replace(/^S\d+\s*[—–-]\s*/, "");
}

export default async function ClasesPage() {
  await obtenerSesion();
  const clases = await getClasesWithContentCached();

  const grabadas = clases.filter(
    (c) => c.status === "Grabada" || Boolean(c.url_grabacion),
  ).length;
  const proxima = clases.find(
    (c) => !c.url_grabacion && (c.status === "Próxima" || c.status === "En vivo"),
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
            {proxima ? stripSemanaPrefix(proxima.titulo) : "Por definir"}
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
