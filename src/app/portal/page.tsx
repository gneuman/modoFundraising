import { obtenerSesion } from "@/lib/auth";
import {
  getFounderProfileCached,
  getClasesWithContentCached,
  type ClaseRecord,
  type FounderProfile,
} from "@/lib/airtable";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Calendar, BookOpen, Users, CreditCard, ChevronRight } from "lucide-react";
import { formatHora, formatFechaSinHora, TZ } from "@/lib/timezone";
import { ClaseCardCTA } from "@/components/portal/clase-card-cta";
import { isMisionEnCurso } from "@/lib/mision-status";

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
        <ClasesSection profile={profile} />
      </Suspense>
    </div>
  );
}

// Ventana del home: la última clase ya pasada + las próximas dentro de 14 días.
const VENTANA_DIAS = 14;

async function ClasesSection({ profile }: { profile: FounderProfile | null }) {
  const clases = await getClasesWithContentCached();
  const hayClases = clases.length > 0;
  const hayMisionesActivas = clases.some((c) =>
    c.misionesData.some((m) => isMisionEnCurso(m.status))
  );

  // Server Component (async): Date.now() es determinista por request, no re-render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const ventanaFin = now + VENTANA_DIAS * 86_400_000;
  const conFecha = clases.filter((c) => c.fecha);

  // Última clase ya dada (la más reciente con fecha < ahora).
  const ultimaPasada = conFecha
    .filter((c) => new Date(c.fecha!).getTime() < now)
    .sort((a, b) => new Date(b.fecha!).getTime() - new Date(a.fecha!).getTime())[0];

  // Próximas dentro de la ventana de 14 días.
  const proximas14 = conFecha
    .filter((c) => {
      const t = new Date(c.fecha!).getTime();
      return t >= now && t <= ventanaFin;
    })
    .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime());

  const relevantes = [...(ultimaPasada ? [ultimaPasada] : []), ...proximas14];
  const gruposRelevantes = groupByDay(relevantes);

  // "Ver todas →" solo si hay clases fuera de la ventana mostrada.
  const idsMostradas = new Set(relevantes.map((c) => c.id));
  const hayMasClases = clases.some((c) => !idsMostradas.has(c.id));

  // Datos clave para las cards de sección.
  const proximaClase = proximas14[0] ?? ultimaPasada;
  const teamCount = profile?.team?.length ?? 0;
  const paymentStatus = profile?.payment_status;

  return (
    <>
      {hayClases && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-800">Tus clases</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Clase pasada y próximas {VENTANA_DIAS} días
              </p>
            </div>
            {hayMasClases && (
              <Link
                href="/portal/clases"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver todas →
              </Link>
            )}
          </div>

          {gruposRelevantes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
              No hay clases en los próximos {VENTANA_DIAS} días. Revisa todas en{" "}
              <Link href="/portal/clases" className="text-blue-600 hover:underline">
                Clases
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-8">
              {gruposRelevantes.map((grupo) => (
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

      {/* Secciones con info clave (no botones planos): cada card lleva a su
          sección y adelanta el dato más relevante. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hayClases && (
          <SeccionCard
            href="/portal/clases"
            icon={<BookOpen className="h-5 w-5 text-blue-500" />}
            label="Clases"
            valor={
              proximaClase
                ? stripSemanaPrefix(proximaClase.titulo) ?? "Ver calendario"
                : "Ver calendario"
            }
            detalle={
              proximaClase?.fecha
                ? formatFechaSinHora(proximaClase.fecha) ?? undefined
                : undefined
            }
          />
        )}
        {hayMisionesActivas && (
          <SeccionCard
            href="/portal/misiones"
            icon={<span className="text-xl leading-none">🎯</span>}
            label="Misiones"
            valor="Tienes misiones activas"
            detalle="Completa las tareas de la semana"
          />
        )}
        <SeccionCard
          href="/portal/equipo"
          icon={<Users className="h-5 w-5 text-purple-500" />}
          label="Equipo"
          valor={
            teamCount > 0
              ? `${teamCount} ${teamCount === 1 ? "integrante" : "integrantes"}`
              : "Gestiona tu equipo"
          }
          detalle={profile?.startup_name ?? undefined}
        />
        <SeccionCard
          href="/portal/suscripcion"
          icon={<CreditCard className="h-5 w-5 text-emerald-500" />}
          label="Suscripción"
          valor={paymentStatus ?? "Ver estado"}
          detalle="Modo Fundraising 2026"
        />
      </div>
    </>
  );
}

function SeccionCard({
  href,
  icon,
  label,
  valor,
  detalle,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all group flex items-center gap-3"
    >
      <div className="shrink-0 h-10 w-10 rounded-lg bg-zinc-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="text-sm font-semibold text-zinc-800 truncate group-hover:text-blue-600 transition-colors">
          {valor}
        </p>
        {detalle && (
          <p className="text-xs text-zinc-400 truncate mt-0.5">{detalle}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0 group-hover:text-blue-400 transition-colors" />
    </Link>
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
            <ClaseCardCTA
              claseId={clase.id!}
              isLive={isLive}
              meetUrl={clase.url_live}
              recordingUrl={clase.url_grabacion}
            />
          </div>
        </div>

        {/* Portada tipo Luma */}
        {portadaUrl ? (
          <div className="w-32 sm:w-40 h-24 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-zinc-100 relative">
            <Image
              src={portadaUrl}
              alt={clase.titulo ?? ""}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
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
