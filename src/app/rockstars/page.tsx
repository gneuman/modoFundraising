import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getRockstars, getHomeMetrics, type Rockstar } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "Rockstars — Modo Fundraising 2026",
  description: "Los founders que cerraron su ronda con Modo Fundraising. Historias reales de LatAm.",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `US$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `US$${(n / 1_000).toFixed(0)}K`;
  return `US$${n}`;
}

export default async function RockstarsPage() {
  const [rockstars, metrics] = await Promise.all([
    getRockstars().catch(() => [] as Rockstar[]),
    getHomeMetrics("2025").catch(() => null),
  ]);

  const stats = [
    { value: metrics ? `+${metrics.n_startups}` : "+400", label: "Startups formadas" },
    { value: metrics ? `+${formatUSD(metrics.capital_levantado_usd)}` : "+US$180M", label: "Capital levantado" },
    { value: metrics ? `${metrics.n_paises}` : "12", label: "Países" },
    { value: metrics ? `${metrics.nps}` : "9.2", label: "NPS promedio" },
  ];

  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-(--brand-navy) via-(--brand-navy-mid) to-(--brand-navy)" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">Alumni · Historias reales</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Los <span className="text-(--brand-teal)">Rockstars</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Founders de LatAm que pasaron por el programa y cerraron sus rondas.
              Sus historias, sus números, sus aprendizajes.
            </p>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-4xl font-black text-(--brand-teal)">{value}</div>
                <div className="text-white/50 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-4">Datos acumulados · Ediciones 2023–2025</p>
        </div>
      </section>

      {/* Grid rockstars */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black mb-2">Casos de <span className="text-(--brand-teal)">éxito</span></h2>
        <p className="text-white/50 mb-10">Una muestra de los founders que levantaron con el programa.</p>

        {rockstars.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — los casos de éxito se están cargando.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rockstars.map((r) => (
              <div
                key={r.id ?? r.nombre}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-(--brand-teal)/30 transition-all flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  {r.foto_url ? (
                    <Image
                      src={r.foto_url}
                      alt={r.nombre}
                      width={48}
                      height={48}
                      className="rounded-full object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-(--brand-teal)/20 border border-(--brand-teal)/30 flex items-center justify-center text-sm font-black text-(--brand-teal) flex-shrink-0">
                      {initials(r.nombre)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white">{r.nombre}</div>
                    <div className="text-white/50 text-xs">{r.empresa}</div>
                    {r.tipo && <div className="text-(--brand-teal) text-xs font-semibold">{r.tipo}</div>}
                  </div>
                </div>

                <p className="text-white/70 text-sm leading-relaxed italic flex-1">
                  &ldquo;{r.track_record_oneliner}&rdquo;
                </p>

                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{t}</span>
                    ))}
                  </div>
                )}

                {r.linkedin_url && (
                  <a
                    href={r.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-xs font-bold border border-white/10 text-white/50 rounded-lg py-2 hover:border-(--brand-teal)/30 hover:text-(--brand-teal) transition-colors"
                  >
                    LinkedIn →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Social proof adicional */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-4xl font-black mb-4">
            Tu historia podría estar <span className="text-(--brand-teal)">aquí</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Cada edición suma nuevos rockstars al listado. Founders que llegaron sin saber cómo hablarle a un VC
            y salieron con una ronda cerrada y una red que sigue generando deals.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          ¿Listo para ser el <span className="text-(--brand-teal)">próximo?</span>
        </h2>
        <p className="text-white/50 mb-8">Postulaciones abiertas hasta el 22 de junio de 2026.</p>
        <Link
          href="/apply"
          className="inline-flex items-center gap-2 bg-(--brand-teal) hover:bg-(--brand-teal-dark) text-(--brand-navy) font-black text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
        >
          Postular ahora →
        </Link>
      </section>

      <Footer />
    </div>
  );
}
