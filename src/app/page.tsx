import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { Countdown } from "@/components/home/countdown";
import { MetricsAnimated } from "@/components/home/metrics-animated";
import { LogosStrip } from "@/components/home/logos-strip";
import { NewsletterForm } from "@/components/home/newsletter-form";
import {
  getHomeMetrics,
  getHomeTestimonios,
  getHomeCasosExito,
  getHomeLogosAlumni,
  getHomeLogosPartnersByTier,
  type HomeTestimonio,
  type HomeCasoExito,
  type HomeLogoPartner,
  type HomeLogoAlumni,
} from "@/lib/airtable";

export const revalidate = 900; // 15 min ISR

const CLOSE_DATE = "2026-06-22T23:59:00-04:00";
const WHATSAPP_URL = "https://wa.me/56912345678?text=Hola%2C%20quiero%20info%20sobre%20Modo%20Fundraising%202026";

// ─── Outcomes ─────────────────────────────────────────────────────────────────

const OUTCOMES = [
  {
    icon: "🎯",
    title: "Estrategia de ronda",
    desc: "Define el tamaño, timing y estructura de tu ronda con precisión.",
  },
  {
    icon: "📣",
    title: "Narrativa investor-ready",
    desc: "Construye el pitch que hace que los VCs quieran reunirse contigo.",
  },
  {
    icon: "🗺️",
    title: "Investor targeting",
    desc: "Identifica y accede a los inversionistas correctos para tu etapa.",
  },
  {
    icon: "🤝",
    title: "Cierre efectivo",
    desc: "Negocia y cierra tu ronda con los mejores términos posibles.",
  },
];

// ─── Pillars ──────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: "⭐",
    title: "Premium",
    desc: "Contenido de clase mundial, no genérico. Cada sesión está diseñada para transformar tu proceso de fundraising.",
  },
  {
    icon: "🌎",
    title: "LatAm-centric",
    desc: "Contexto real del ecosistema donde operás. Casos, inversores y lógica de los mercados donde levantás capital.",
  },
  {
    icon: "🤜",
    title: "Founder-to-founder",
    desc: "Aprende de quienes lo hicieron, no de teóricos. Cada instructor levantó su propia ronda.",
  },
  {
    icon: "🔗",
    title: "Investor network real",
    desc: "Conexión directa con fondos que invierten en LatAm. No directorio. Red viva con deal flow.",
  },
];

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_TESTIMONIOS: HomeTestimonio[] = [
  {
    nombre: "María González",
    empresa: "TechLatAm",
    ronda: "Seed US$1.2M",
    quote: "Modo Fundraising me dio la estructura que necesitaba para hablarle a los VCs con confianza. Cerré mi ronda en 4 meses.",
    foto_url: "",
    orden: 1,
    activa: true,
  },
  {
    nombre: "Carlos Mendoza",
    empresa: "AgroIA",
    ronda: "Pre-seed US$600K",
    quote: "El programa no es teoría. Es práctica pura. Cada misión la apliqué directo a mis conversaciones con inversores.",
    foto_url: "",
    orden: 2,
    activa: true,
  },
  {
    nombre: "Valentina Torres",
    empresa: "FinStack",
    ronda: "Seed US$2M",
    quote: "Antes del programa tenía el pitch pero no el proceso. Ahora tengo los dos. La diferencia es brutal.",
    foto_url: "",
    orden: 3,
    activa: true,
  },
];

const PLACEHOLDER_CASOS: HomeCasoExito[] = [
  { startup_nombre: "TechLatAm", logo_url: "", monto_usd: 1200000, investors: "Kaszek · ALLVP", hook: "De cero a term sheet en 90 días", orden: 1, activa: true },
  { startup_nombre: "AgroIA", logo_url: "", monto_usd: 600000, investors: "Nazca · Clocktower", hook: "Levantó su ronda en plena corrección", orden: 2, activa: true },
  { startup_nombre: "FinStack", logo_url: "", monto_usd: 2000000, investors: "a16z Emerging · Monashees", hook: "Primera reunión → inversión en 3 semanas", orden: 3, activa: true },
  { startup_nombre: "HealthCo", logo_url: "", monto_usd: 800000, investors: "IDEO Ventures · Endeavor", hook: "Pitch rechazado → rediseñado → cerrado", orden: 4, activa: true },
  { startup_nombre: "LogiTech", logo_url: "", monto_usd: 1500000, investors: "Y Combinator · Softbank", hook: "Del MVP al preseed en 6 meses", orden: 5, activa: true },
  { startup_nombre: "EduMax", logo_url: "", monto_usd: 500000, investors: "IFC · BID Lab", hook: "Narrativa que convenció a 3 fondos a la vez", orden: 6, activa: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `US$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `US$${(n / 1_000).toFixed(0)}K`;
  return `US$${n}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Fetch all data in parallel, fallback to null/[] on error
  const [metrics, testimonios, casos, logosAlumni, tier1, tier2, tier3] = await Promise.all([
    getHomeMetrics("2025").catch(() => null),
    getHomeTestimonios().catch(() => [] as HomeTestimonio[]),
    getHomeCasosExito().catch(() => [] as HomeCasoExito[]),
    getHomeLogosAlumni().catch(() => [] as HomeLogoAlumni[]),
    getHomeLogosPartnersByTier(1).catch(() => [] as HomeLogoPartner[]),
    getHomeLogosPartnersByTier(2).catch(() => [] as HomeLogoPartner[]),
    getHomeLogosPartnersByTier(3).catch(() => [] as HomeLogoPartner[]),
  ]);

  const displayTestimonios = testimonios.length > 0 ? testimonios : PLACEHOLDER_TESTIMONIOS;
  const displayCasos = casos.length > 0 ? casos : PLACEHOLDER_CASOS;

  const metricsData = [
    {
      label: "Capital levantado",
      value: metrics ? `+${formatUSD(metrics.capital_levantado_usd)}` : "+US$180M",
    },
    { label: "Startups", value: metrics ? `+${metrics.n_startups}` : "+400" },
    { label: "Países", value: metrics ? `${metrics.n_paises}` : "12" },
    { label: "Inversionistas", value: metrics ? `+${metrics.n_inversionistas}` : "+200" },
    { label: "Masterclasses", value: metrics ? `${metrics.n_masterclasses}+` : "80+" },
    { label: "NPS", value: metrics ? `${metrics.nps}` : "9.2" },
  ];

  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">

      {/* ── 1. Topbar ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#00e5c0]/10 border-b border-[#00e5c0]/20 py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <span className="text-white/80">
            <strong className="text-white">Modo Fundraising 2026</strong> — Postulaciones abiertas
          </span>
          <Countdown targetIso={CLOSE_DATE} />
        </div>
      </div>

      {/* ── 2. Nav ─────────────────────────────────────────────────────────────── */}
      <Nav />

      {/* ── 3. Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-28">
          {/* Powered by Oracle ribbon */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-5 py-2 mb-8 shadow-lg">
            <span className="text-[#0a0e1a] text-xs font-bold uppercase tracking-widest">Powered by</span>
            <span className="text-[#c74634] font-black text-lg tracking-tight">ORACLE</span>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-black leading-none mb-3 tracking-tight">
                MODO<br />
                <span className="text-[#00e5c0]">FUNDRAISING</span>
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-white/90 mb-4 leading-snug">
                Construye momentum que los inversionistas no puedan ignorar.
              </p>
              <p className="text-white/60 text-base mb-6 leading-relaxed">
                Aprende cómo los mejores founders de LatAm levantan capital usando estrategia, narrativa y ejecución.
                Si planeas levantar una ronda pre-seed, seed o post-seed entre US$500K y US$5M este año, déjanos ayudarte.
              </p>

              {/* Pricing chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["US$349/mes", "13 semanas", "100% online", "Money Back 14 días"].map((item) => (
                  <span
                    key={item}
                    className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm font-semibold text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Countdown in hero */}
              <div className="flex items-center gap-3 mb-8 text-sm text-white/50">
                <span>Cierre de postulaciones en</span>
                <Countdown targetIso={CLOSE_DATE} compact />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/apply"
                  className="inline-flex items-center justify-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black text-base px-8 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
                >
                  Postular ahora →
                </Link>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors"
                >
                  Hablar con el equipo
                </a>
              </div>
            </div>

            {/* David (Bicho) placeholder */}
            <div className="flex justify-center md:justify-center mt-8 md:mt-0">
              <div className="flex flex-col items-center gap-4">
                <div className="w-[120px] h-[120px] md:w-[220px] md:h-[220px] rounded-full bg-gradient-to-br from-[#00e5c0]/30 to-[#0d6efd]/20 border-2 border-[#00e5c0]/40 flex items-center justify-center shadow-[0_0_60px_#00e5c020]">
                  <span className="text-4xl md:text-7xl font-black text-[#00e5c0]">DA</span>
                </div>
                <div className="text-center">
                  <div className="font-black text-white text-lg md:text-xl">David Alvo</div>
                  <div className="text-white/50 text-xs md:text-sm mt-1 max-w-[200px] leading-snug">Founder &amp; Managing Partner, Impacta VC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Trust strip ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-white/30 text-xs uppercase tracking-widest mb-6">Alumni que ya levantaron</p>
          <LogosStrip logos={logosAlumni} />

          {/* Métricas Ed. 2025 */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: metrics ? `+${formatUSD(metrics.capital_levantado_usd)}` : "+US$180M", label: "Capital levantado" },
              { value: metrics ? `+${metrics.n_startups}` : "+400", label: "Startups" },
              { value: metrics ? `${metrics.n_paises}` : "12", label: "Países" },
              { value: metrics ? `${metrics.nps}` : "9.2", label: "NPS promedio" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-4xl font-black text-[#00e5c0]">{value}</div>
                <div className="text-white/50 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-4">Datos de la edición 2025</p>
        </div>
      </section>

      {/* ── 5. ¿Qué vas a lograr? ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-4xl md:text-5xl font-black mb-4">
          ¿Qué vas a <span className="text-[#00e5c0]">lograr?</span>
        </h2>
        <p className="text-white/50 mb-12 text-lg">Cuatro outcomes concretos al terminar el programa.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {OUTCOMES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/40 hover:bg-[#00e5c0]/5 transition-all"
            >
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="font-black text-white mb-2">{title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. ¿Por qué Modo Fundraising? ─────────────────────────────────────── */}
      <section className="bg-white/5 border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-center">
            ¿Por qué <span className="text-[#00e5c0]">Modo Fundraising?</span>
          </h2>
          <p className="text-center text-white/50 mb-12 text-lg">Cuatro pilares que lo diferencian.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 transition-all"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-black text-[#00e5c0] mb-2">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Métricas de tracción ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-4xl md:text-5xl font-black mb-2 text-center">Tracción real</h2>
        <p className="text-center text-white/50 mb-12">
          Datos de la edición 2025.{" "}
          <span className="text-[#00e5c0]">Actualizamos en vivo a medida que la cohort 2026 avanza.</span>
        </p>

        <MetricsAnimated metrics={metricsData} />
      </section>

      {/* ── 8. Programa en 3 párrafos ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#0d1b3e] to-[#0a0e1a] border-y border-white/10 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black mb-8">El programa</h2>
          <div className="space-y-5 text-white/70 text-lg leading-relaxed">
            <p>
              Modo Fundraising es un programa de{" "}
              <strong className="text-white">13 semanas, 100% online</strong>, diseñado para founders que están
              levantando una ronda entre US$500K y US$5M.
            </p>
            <p>
              Cada semana combinamos clases en vivo, masterclasses con expertos, live interviews con inversores reales
              y <strong className="text-white">misiones prácticas</strong> que aplicás directo a tu proceso.
            </p>
            <p>
              Al terminar, tenés una estrategia de ronda completa, una narrativa afinada y acceso a una{" "}
              <strong className="text-white">red de inversores LatAm</strong> que realmente invierten.
            </p>
          </div>
          <Link
            href="/cronograma"
            className="inline-flex items-center gap-2 mt-10 text-[#00e5c0] font-bold hover:underline text-lg"
          >
            Ver cronograma completo →
          </Link>
        </div>
      </section>

      {/* ── 9. Testimonios ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-4xl md:text-5xl font-black mb-2 text-center">Lo que dicen los founders</h2>
        <p className="text-center text-white/50 mb-12">Founders que lo vivieron.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {displayTestimonios.slice(0, 3).map((t) => (
            <div
              key={t.nombre}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#00e5c0]/30 transition-all"
            >
              <p className="text-white/80 text-sm leading-relaxed flex-1">
                <span className="text-[#00e5c0] text-2xl font-black leading-none mr-1">&ldquo;</span>
                {t.quote}
                <span className="text-[#00e5c0] text-2xl font-black leading-none ml-1">&rdquo;</span>
              </p>
              <div className="flex items-center gap-3">
                {t.foto_url ? (
                  <Image
                    src={t.foto_url}
                    alt={t.nombre}
                    width={44}
                    height={44}
                    className="rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#00e5c0]/20 border border-[#00e5c0]/30 flex items-center justify-center text-sm font-black text-[#00e5c0] flex-shrink-0">
                    {initials(t.nombre)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-white text-sm">{t.nombre}</div>
                  <div className="text-white/50 text-xs">{t.empresa} · {t.ronda}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 10. Casos de éxito ─────────────────────────────────────────────────── */}
      <section className="bg-white/5 border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black mb-2 text-center">Casos de éxito</h2>
          <p className="text-center text-white/50 mb-12">Startups que cerraron su ronda con el programa.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayCasos.map((c) => (
              <div
                key={c.startup_nombre}
                className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 transition-all flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <Image src={c.logo_url} alt={c.startup_nombre} width={40} height={40} className="object-contain rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#00e5c0]/10 border border-[#00e5c0]/20 flex items-center justify-center text-xs font-black text-[#00e5c0]">
                      {initials(c.startup_nombre)}
                    </div>
                  )}
                  <span className="font-bold text-white">{c.startup_nombre}</span>
                </div>
                <div className="text-3xl font-black text-[#00e5c0]">{formatUSD(c.monto_usd)}</div>
                <div className="text-white/50 text-xs">{c.investors}</div>
                <div className="text-white/70 text-sm italic">&ldquo;{c.hook}&rdquo;</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. Money Back Guarantee ───────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-24">
        <div className="border border-[#00e5c0]/30 bg-[#00e5c0]/5 rounded-3xl p-10 text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Garantía Money Back{" "}
            <span className="text-[#00e5c0]">14 días</span>
          </h2>
          <p className="text-white/80 text-lg mb-6 leading-relaxed">
            Desde el primer pago. Sin requisito de asistencia. Si no te convence, te devolvemos el dinero.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-white/50 mb-8">
            <span>✓ Reembolso neto post-comisiones Stripe</span>
            <span>✓ Cancelación libre mes a mes</span>
            <span>✗ Excepción: pago anual</span>
          </div>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
          >
            Postular sin riesgo →
          </Link>
        </div>
      </section>

      {/* ── 12. Derecho de inversión ───────────────────────────────────────────── */}
      <div className="border-y border-white/5 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-white/30 text-xs leading-relaxed">
          Impacta VC y sus fondos afiliados se reservan el derecho de invertir hasta el 20% de la ronda de
          startups seleccionadas, sujeto a due diligence, fit de tesis y aprobación interna.
        </div>
      </div>

      {/* ── 13. Sponsors ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black text-center mb-16">Partners & Sponsors</h2>

        {/* Tier 1 — Oracle */}
        <div className="mb-14">
          <p className="text-white/30 text-xs uppercase tracking-widest text-center mb-6">Powered by</p>
          <div className="max-w-xs mx-auto bg-white rounded-2xl p-8 flex flex-col items-center gap-2 shadow-[0_0_60px_#00e5c010]">
            {tier1.length > 0 ? (
              tier1.map((p) => (
                <a key={p.nombre} href={p.website_url ?? "#"} target="_blank" rel="noopener noreferrer">
                  <Image src={p.logo_url} alt={p.alt} width={140} height={60} className="object-contain" />
                </a>
              ))
            ) : (
              <>
                <span className="text-[#c74634] font-black text-3xl tracking-tight">ORACLE</span>
                <span className="text-[#0a0e1a]/50 text-xs">Sponsor principal</span>
              </>
            )}
          </div>
        </div>

        {/* Tier 2 */}
        <div className="mb-14">
          <p className="text-white/30 text-xs uppercase tracking-widest text-center mb-6">Institutional partners</p>
          <div className="flex justify-center gap-8 flex-wrap">
            {tier2.length > 0 ? (
              tier2.map((p) => (
                <a key={p.nombre} href={p.website_url ?? "#"} target="_blank" rel="noopener noreferrer" className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 hover:border-[#00e5c0]/40 transition-all">
                  <Image src={p.logo_url} alt={p.alt} width={120} height={50} className="object-contain" />
                </a>
              ))
            ) : (
              <>
                <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 text-white font-bold text-lg">Corfo</div>
                <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 text-white font-bold text-lg">Quintil Valley</div>
              </>
            )}
          </div>
        </div>

        {/* Tier 3 */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest text-center mb-6">Program partners</p>
          <div className="flex flex-wrap justify-center gap-4">
            {tier3.length > 0 ? (
              tier3.map((p) => (
                <a key={p.nombre} href={p.website_url ?? "#"} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 rounded-lg px-5 py-3 hover:border-[#00e5c0]/30 transition-all">
                  <Image src={p.logo_url} alt={p.alt} width={80} height={35} className="object-contain opacity-70" />
                </a>
              ))
            ) : (
              ["Partner A", "Partner B", "Partner C", "Partner D", "Partner E"].map((n) => (
                <div key={n} className="bg-white/5 border border-white/10 rounded-lg px-5 py-3 text-white/40 text-sm">{n}</div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── 14. CTA final ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#0d1b3e]/50 to-[#0a0e1a] border-y border-white/10 py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-4 leading-tight">
            ¿Listo para<br />
            <span className="text-[#00e5c0]">levantar tu ronda?</span>
          </h2>
          <p className="text-white/50 mb-6 text-lg">Cierre de postulaciones en:</p>
          <div className="flex justify-center mb-10">
            <Countdown targetIso={CLOSE_DATE} />
          </div>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black text-xl px-12 py-5 rounded-xl transition-all shadow-[0_0_60px_#00e5c040] mb-6"
          >
            Postular ahora →
          </Link>
          <div className="mt-10 border-t border-white/10 pt-10">
            <p className="text-white/50 mb-4 text-sm">O recibí contenido de fundraising directamente en tu inbox</p>
            <NewsletterForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
