import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Rockstars — Modo Fundraising 2026",
  description: "Los founders que cerraron su ronda con Modo Fundraising. Historias reales de LatAm.",
};

const ROCKSTARS = [
  {
    nombre: "María González",
    empresa: "TechLatAm",
    ronda: "Seed US$1.2M",
    investors: "Kaszek · ALLVP",
    hook: "De cero a term sheet en 90 días",
    quote: "Modo Fundraising me dio la estructura que necesitaba para hablarle a los VCs con confianza. Cerré mi ronda en 4 meses.",
    pais: "🇨🇱 Chile",
    initials: "MG",
  },
  {
    nombre: "Carlos Mendoza",
    empresa: "AgroIA",
    ronda: "Pre-seed US$600K",
    investors: "Nazca · Clocktower",
    hook: "Levantó su ronda en plena corrección",
    quote: "El programa no es teoría. Es práctica pura. Cada misión la apliqué directo a mis conversaciones con inversores.",
    pais: "🇲🇽 México",
    initials: "CM",
  },
  {
    nombre: "Valentina Torres",
    empresa: "FinStack",
    ronda: "Seed US$2M",
    investors: "a16z Emerging · Monashees",
    hook: "Pitch rechazado → rediseñado → cerrado",
    quote: "Antes del programa tenía el pitch pero no el proceso. Ahora tengo los dos. La diferencia es brutal.",
    pais: "🇧🇷 Brasil",
    initials: "VT",
  },
  {
    nombre: "Andrés Rojas",
    empresa: "HealthCo",
    ronda: "Pre-seed US$800K",
    investors: "IDEO Ventures · Endeavor",
    hook: "Primera reunión → inversión en 3 semanas",
    quote: "El advisory y la red de Impacta VC fueron el diferencial. Sin esas conexiones, hubiera tardado el doble.",
    pais: "🇨🇴 Colombia",
    initials: "AR",
  },
  {
    nombre: "Daniela Ríos",
    empresa: "LogiTech",
    ronda: "Seed US$1.5M",
    investors: "Y Combinator · Softbank",
    hook: "Del MVP al seed en 6 meses",
    quote: "Las sesiones Rockstar cambiaron todo. Practicar el pitch en vivo con feedback real es incomparable.",
    pais: "🇦🇷 Argentina",
    initials: "DR",
  },
  {
    nombre: "Mateo Vargas",
    empresa: "EduMax",
    ronda: "Pre-seed US$500K",
    investors: "IFC · BID Lab",
    hook: "Narrativa que convenció a 3 fondos a la vez",
    quote: "Llegué al programa sin saber cómo hablarle a un VC. Salí con un term sheet y una red que sigue generando deals.",
    pais: "🇵🇪 Perú",
    initials: "MV",
  },
];

const STATS = [
  { value: "+400", label: "Startups formadas" },
  { value: "+US$180M", label: "Capital levantado" },
  { value: "12", label: "Países" },
  { value: "9.2", label: "NPS promedio" },
];

export default function RockstarsPage() {
  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">Alumni · Historias reales</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Los <span className="text-[#00e5c0]">Rockstars</span>
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
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-4xl font-black text-[#00e5c0]">{value}</div>
                <div className="text-white/50 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-4">Datos acumulados · Ediciones 2023–2025</p>
        </div>
      </section>

      {/* Grid rockstars */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black mb-2">Casos de <span className="text-[#00e5c0]">éxito</span></h2>
        <p className="text-white/50 mb-10">Una muestra de los founders que levantaron con el programa.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROCKSTARS.map((r) => (
            <div
              key={r.nombre}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 transition-all flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#00e5c0]/20 border border-[#00e5c0]/30 flex items-center justify-center text-sm font-black text-[#00e5c0] flex-shrink-0">
                  {r.initials}
                </div>
                <div>
                  <div className="font-bold text-white">{r.nombre}</div>
                  <div className="text-white/50 text-xs">{r.empresa} · {r.pais}</div>
                </div>
              </div>

              {/* Ronda */}
              <div className="bg-[#00e5c0]/5 border border-[#00e5c0]/20 rounded-xl p-3">
                <div className="text-2xl font-black text-[#00e5c0]">{r.ronda}</div>
                <div className="text-white/50 text-xs mt-0.5">{r.investors}</div>
              </div>

              {/* Hook */}
              <p className="text-white/80 text-sm font-semibold italic">&ldquo;{r.hook}&rdquo;</p>

              {/* Quote */}
              <p className="text-white/50 text-sm leading-relaxed flex-1">{r.quote}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof adicional */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-4xl font-black mb-4">
            Tu historia podría estar <span className="text-[#00e5c0]">aquí</span>
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
          ¿Listo para ser el <span className="text-[#00e5c0]">próximo?</span>
        </h2>
        <p className="text-white/50 mb-8">Postulaciones abiertas hasta el 22 de junio de 2026.</p>
        <Link
          href="/apply"
          className="inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
        >
          Postular ahora →
        </Link>
      </section>

      <Footer />
    </div>
  );
}
