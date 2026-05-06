import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Live Interviews — Modo Fundraising 2026",
  description: "Entrevistas en vivo con founders e inversores reales de LatAm. Sin filtros, sin PR.",
};

const TIPOS: Record<string, string> = {
  "Founder Story":   "bg-[#00e5c0]/15 text-[#00e5c0] border-[#00e5c0]/30",
  "VC Perspective":  "bg-[#0d6efd]/15 text-[#60a5fa] border-[#0d6efd]/30",
  "Deck Review":     "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30",
  "Investor AMA":    "bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/30",
  "Tactic Deep Dive":"bg-[#f87171]/15 text-[#f87171] border-[#f87171]/30",
  "Expert Session":  "bg-white/10 text-white/60 border-white/20",
  "Negotiation":     "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30",
  "Panel AMA":       "bg-[#00e5c0]/15 text-[#00e5c0] border-[#00e5c0]/30",
};

const INTERVIEWS = [
  { nro: 1,  titulo: "Founder que levantó seed en 60 días",           tipo: "Founder Story",    semana: 1,  fecha: "3 Jul",   speaker: "Por confirmar · Portfolio Impacta VC",  desc: "Qué hizo diferente, cómo construyó el pipeline y cómo manejó los rechazos." },
  { nro: 2,  titulo: "VC LatAm — Qué busco en un seed deal",          tipo: "VC Perspective",   semana: 2,  fecha: "10 Jul",  speaker: "Por confirmar · Fondo Seed LatAm",       desc: "Tesis de inversión, cómo evalúa founders y qué hace que un deal se cierre." },
  { nro: 3,  titulo: "Cómo construí mi pitch deck ganador",           tipo: "Deck Review",      semana: 3,  fecha: "17 Jul",  speaker: "Por confirmar · Startup LatAm",          desc: "Muestra su pitch deck real, itera en vivo y responde preguntas del grupo." },
  { nro: 4,  titulo: "Angel Investor — El proceso de decisión",       tipo: "Investor AMA",     semana: 4,  fecha: "24 Jul",  speaker: "Por confirmar · Angel Network",           desc: "Cómo evalúa deals pre-seed, qué documentos pide y cómo acercarse efectivamente." },
  { nro: 5,  titulo: "Levantando capital con tracción mínima",        tipo: "Founder Story",    semana: 5,  fecha: "31 Jul",  speaker: "Por confirmar · Portfolio Impacta VC",   desc: "Cómo convirtió la narrativa en su principal activo cuando los números eran pequeños." },
  { nro: 6,  titulo: "Partner de Kaszek — Qué mueve el needle",      tipo: "VC Perspective",   semana: 6,  fecha: "7 Ago",   speaker: "Por confirmar · Kaszek",                 desc: "Estado del ecosistema, sectores de interés y cómo piensan el pricing en seed." },
  { nro: 7,  titulo: "Cold outreach que convirtió — Casos reales",   tipo: "Tactic Deep Dive", semana: 7,  fecha: "14 Ago",  speaker: "Por confirmar · Startup B2B LatAm",      desc: "Los cold emails reales que generaron reuniones con VCs de primer nivel." },
  { nro: 8,  titulo: "Cómo conseguí mi lead investor",               tipo: "Founder Story",    semana: 8,  fecha: "21 Ago",  speaker: "Por confirmar · Portfolio Impacta VC",   desc: "El proceso exacto para identificar, acercarse y convencer al lead investor." },
  { nro: 9,  titulo: "Due Diligence desde adentro",                  tipo: "Expert Session",   semana: 9,  fecha: "28 Ago",  speaker: "Por confirmar · Firma Legal VC",         desc: "Documentos que piden, cuánto dura y cómo prepararse para no frenar el cierre." },
  { nro: 10, titulo: "Negociando valuación — El arte del no inmediato", tipo: "Negotiation",   semana: 10, fecha: "4 Sep",   speaker: "Por confirmar · Fondo Pre-seed",         desc: "Cómo piensan la valuación los fondos y qué argumentos les funcionan a los founders." },
  { nro: 11, titulo: "Cómo generé FOMO entre 5 fondos",             tipo: "Tactic Deep Dive", semana: 11, fecha: "11 Sep",  speaker: "Por confirmar · Startup SaaS LatAm",     desc: "Cómo generó urgencia sin mentir y coordinó los tiempos con múltiples fondos." },
  { nro: 12, titulo: "Panel de cierre — 3 VCs, 30 preguntas",       tipo: "Panel AMA",        semana: 12, fecha: "25 Sep",  speaker: "Panel de 3 inversores · Fondos LatAm",   desc: "Sesión final abierta. Los founders del programa hacen las preguntas. Sin filtros." },
];

export default function LiveInterviewsPage() {
  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">Sesiones semanales · 2026</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Live <span className="text-[#00e5c0]">Interviews</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-6">
              Cada semana, un founder o inversor real en conversación abierta con David Alvo.
              Sin guión, sin PR, sin respuestas ensayadas.
            </p>
            <div className="flex flex-wrap gap-3">
              {["12 sesiones en vivo", "Grabadas y disponibles", "Q&A abierto"].map((item) => (
                <span key={item} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm font-semibold text-white">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leyenda de tipos */}
      <section className="border-y border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-3 items-center">
          <span className="text-white/30 text-xs uppercase tracking-widest mr-2">Formato</span>
          {Object.entries(TIPOS).map(([tipo, color]) => (
            <span key={tipo} className={`text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>{tipo}</span>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INTERVIEWS.map((li) => (
            <div
              key={li.nro}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#00e5c0]/30 hover:bg-[#00e5c0]/5 transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-white/30 text-xs font-mono">LI{li.nro.toString().padStart(2, "0")}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIPOS[li.tipo]}`}>{li.tipo}</span>
              </div>
              <div>
                <h3 className="font-black text-white text-base leading-tight">{li.titulo}</h3>
                <p className="text-white/40 text-xs mt-1">{li.fecha} · Semana {li.semana}</p>
              </div>
              <p className="text-white/60 text-xs leading-relaxed flex-1">{li.desc}</p>
              <p className="text-[#00e5c0] text-xs font-semibold border-t border-white/10 pt-2">{li.speaker}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Propuesta de valor */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-10 text-center">Por qué son <span className="text-[#00e5c0]">diferentes</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎙️", titulo: "Sin filtros", desc: "Las preguntas las hacen los founders del programa. No hay temas prohibidos ni respuestas ensayadas." },
              { icon: "📚", titulo: "Casos reales", desc: "Cada speaker viene con números, emails, decks y procesos reales — no con genéricos ni teoría." },
              { icon: "🎬", titulo: "Acceso permanente", desc: "Todas las sesiones quedan grabadas. Alumni de ediciones anteriores tienen acceso al archivo completo." },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-6 text-center hover:border-[#00e5c0]/30 transition-all">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-black text-[#00e5c0] mb-2">{titulo}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          Accedé a todas las <span className="text-[#00e5c0]">sesiones en vivo</span>
        </h2>
        <p className="text-white/50 mb-8">Solo para alumnos del programa. Postulá para entrar.</p>
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
