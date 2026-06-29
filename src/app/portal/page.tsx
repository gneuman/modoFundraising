import { obtenerSesion } from "@/lib/auth";
import { getFounderProfileCached, getClasesWithContentCached, type ClaseRecord } from "@/lib/airtable";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Video, Calendar } from "lucide-react";
import { formatHora, TZ } from "@/lib/timezone";
import { EnterMeetButton } from "@/components/portal/enter-meet-button";

export const dynamic = "force-dynamic";

// Quita el prefijo "S1 — ", "S12 — ", "S26 — " del título para mostrar al founder.
// En admin se conserva el prefijo para mantener el orden visual.
function stripSemanaPrefix(titulo?: string): string | undefined {
  if (!titulo) return titulo;
  return titulo.replace(/^S\d+\s*[—–-]\s*/, "");
}

function groupByDay(clases: ClaseRecord[]) {
  const groups = new Map<string, { label: string; clases: ClaseRecord[] }>();
  const fmtKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fmtLabel = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  for (const c of clases) {
    if (!c.fecha) continue;
    const d = new Date(c.fecha);
    const key = fmtKey.format(d);
    if (!groups.has(key)) {
      groups.set(key, { label: fmtLabel.format(d), clases: [] });
    }
    groups.get(key)!.clases.push(c);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, ...value }));
}

export default async function PortalPage() {
  const session = await obtenerSesion();
  // getFounderProfileCached usa React.cache: deduplicado con la llamada del layout.
  const profile = await getFounderProfileCached(session?.email ?? "");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">
          ¡Bienvenido/a, {profile?.first_name}! 👋
        </h1>
        <p className="text-zinc-500 mt-1">{profile?.startup_name} — Modo Fundraising 2026</p>
      </div>

      <Suspense fallback={<ClasesSkeleton />}>
        <ClasesSection />
      </Suspense>
    </div>
  );
}

async function ClasesSection() {
  const clases = await getClasesWithContentCached();
  const hayClases = clases.length > 0;
  const hayMisionesActivas = clases.some((c) =>
    c.misionesData.some((m) => m.status === "Activa")
  );

  const proximas = clases.filter((c) => c.status !== "Grabada");
  const grabadas = clases.filter((c) => c.status === "Grabada");
  const gruposProximas = groupByDay(proximas);

  return (
    <>
      {hayClases && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-800">Próximas clases</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {proximas.length} {proximas.length === 1 ? "clase próxima" : "clases próximas"}
                {grabadas.length > 0 && ` · ${grabadas.length} grabadas`}
              </p>
            </div>
            <Link
              href="/portal/clases"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todas →
            </Link>
          </div>

          {gruposProximas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
              No hay clases próximas. Revisa las grabaciones en{" "}
              <Link href="/portal/clases" className="text-blue-600 hover:underline">
                Clases
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-8">
              {gruposProximas.map((grupo) => (
                <div key={grupo.key} className="flex gap-6">
                  <div className="w-24 shrink-0 pt-1">
                    <p className="text-sm font-semibold text-zinc-800 capitalize leading-tight">
                      {grupo.label.split(",")[0]}
                    </p>
                    <p className="text-xs text-zinc-400 capitalize mt-0.5">
                      {grupo.label.split(",")[1]?.trim()}
                    </p>
                  </div>

                  <div className="flex-1 space-y-3">
                    {grupo.clases.map((clase) => (
                      <ClaseCard key={clase.id} clase={clase} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          hayClases && { href: "/portal/clases", label: "Clases", emoji: "📚" },
          hayMisionesActivas && { href: "/portal/misiones", label: "Misiones", emoji: "🎯" },
          { href: "/portal/equipo", label: "Equipo", emoji: "👥" },
          { href: "/portal/suscripcion", label: "Suscripción", emoji: "💳" },
        ].filter((item): item is { href: string; label: string; emoji: string } => Boolean(item)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all group flex items-center gap-3"
          >
            <div className="text-xl">{item.emoji}</div>
            <p className="font-medium text-sm text-zinc-700 group-hover:text-blue-600 transition-colors">
              {item.label}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

function ClasesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-5 w-40 bg-zinc-200 rounded" />
        <div className="h-3 w-56 bg-zinc-100 rounded" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-6">
          <div className="w-24 shrink-0 space-y-2">
            <div className="h-4 w-16 bg-zinc-200 rounded" />
            <div className="h-3 w-12 bg-zinc-100 rounded" />
          </div>
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-zinc-100 rounded" />
                <div className="h-4 w-3/4 bg-zinc-200 rounded" />
                <div className="h-3 w-full bg-zinc-100 rounded" />
                <div className="h-7 w-28 bg-zinc-200 rounded-lg mt-2" />
              </div>
              <div className="w-32 sm:w-40 h-24 sm:h-28 rounded-xl bg-zinc-200 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaseCard({ clase }: { clase: ClaseRecord }) {
  const isLive = clase.status === "En vivo";
  const portada = clase.Portada?.[0];
  const portadaUrl = portada?.thumbnails?.large?.url ?? portada?.url;
  const hora = formatHora(clase.fecha);

  return (
    <Link
      href={`/portal/clases/${clase.id}`}
      className="block bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all group"
    >
      <div className="flex gap-4 p-4">
        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {hora}
            {isLive && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse ml-1">
                🔴 En vivo
              </span>
            )}
          </div>
          <p className="font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors leading-tight mt-1.5">
            {stripSemanaPrefix(clase.titulo) ?? "Clase sin título"}
          </p>
          {clase.descripcion && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
              {clase.descripcion}
            </p>
          )}
          <div className="mt-auto pt-3">
            {isLive && clase.url_live ? (
              <span onClick={(e) => e.stopPropagation()} className="inline-block">
                <EnterMeetButton
                  claseId={clase.id!}
                  meetUrl={clase.url_live}
                  label="Entrar a la clase"
                />
              </span>
            ) : clase.url_grabacion ? (
              <a
                href={clase.url_grabacion}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Video className="h-3 w-3" /> Ver grabación
              </a>
            ) : (
              <span className="text-xs text-zinc-400">Próxima</span>
            )}
          </div>
        </div>

        {/* Portada tipo Luma */}
        {portadaUrl ? (
          <div className="w-32 sm:w-40 h-24 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-zinc-100 relative">
            <Image
              src={portadaUrl}
              alt={clase.titulo ?? ""}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-32 sm:w-40 h-24 sm:h-28 rounded-xl shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white/90">
              {clase.titulo?.match(/^S(\d+)/)?.[1] ?? clase.semana ?? "—"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
