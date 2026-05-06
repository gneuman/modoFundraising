import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Advisory Board — Modo Fundraising 2026",
  description: "Los mejores founders e inversores de LatAm que guían el programa.",
};

const ADVISORS = [
  {
    nombre: "David Alvo",
    rol: "Founder & Managing Partner",
    empresa: "Impacta VC",
    bio: "Inversor y operador con más de 10 años acelerando startups en LatAm. Diseñó el modelo pedagógico de Modo Fundraising.",
    initials: "DA",
    tags: ["Venture Capital", "Fundraising", "LatAm"],
  },
  {
    nombre: "Yoel Chlimper",
    rol: "Founder & CEO",
    empresa: "Confidencial",
    bio: "Experto en narrativa de fundadores y construcción de marca personal para el ecosistema de VC.",
    initials: "YC",
    tags: ["Storytelling", "Pitch", "Branding"],
  },
  {
    nombre: "Nathan B.",
    rol: "Head of Business Development",
    empresa: "Confidencial",
    bio: "Especialista en cold outreach, estrategias de acceso a inversores y construcción de pipelines de fundraising a escala.",
    initials: "NB",
    tags: ["Outreach", "Growth", "BD"],
  },
  {
    nombre: "Por confirmar",
    rol: "General Partner",
    empresa: "Fondo LatAm",
    bio: "Inversor con tesis activa en seed y pre-seed en LatAm. Más de 40 inversiones en 8 países.",
    initials: "VC",
    tags: ["Seed", "Pre-seed", "LatAm"],
  },
  {
    nombre: "Por confirmar",
    rol: "Founder (2x exit)",
    empresa: "Portfolio Impacta VC",
    bio: "Founder que levantó más de US$8M en dos rondas distintas. Comparte el proceso real de negociación con VCs.",
    initials: "F",
    tags: ["Founder", "Exit", "Negociación"],
  },
  {
    nombre: "Por confirmar",
    rol: "Partner",
    empresa: "Firma Legal",
    bio: "Especialista en estructuración de term sheets, due diligence y contratos de inversión en jurisdicciones latinoamericanas.",
    initials: "LE",
    tags: ["Legal", "Term Sheet", "Due Diligence"],
  },
];

export default function AdvisoryPage() {
  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#00e5c015_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">El equipo detrás del programa</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Advisory <span className="text-[#00e5c0]">Board</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Founders que levantaron rondas, inversores que las cerraron, y expertos que vivieron el proceso en carne propia.
              No hay teoría sin experiencia real.
            </p>
          </div>
        </div>
      </section>

      {/* Grid advisors */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ADVISORS.map((a) => (
            <div
              key={a.nombre}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 hover:bg-[#00e5c0]/5 transition-all flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00e5c0]/20 border border-[#00e5c0]/30 flex items-center justify-center text-lg font-black text-[#00e5c0] flex-shrink-0">
                  {a.initials}
                </div>
                <div>
                  <div className="font-black text-white">{a.nombre}</div>
                  <div className="text-white/50 text-xs">{a.rol}</div>
                  <div className="text-[#00e5c0] text-xs font-semibold">{a.empresa}</div>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed flex-1">{a.bio}</p>
              <div className="flex flex-wrap gap-2">
                {a.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Propuesta de valor */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-center">
            Aprende de quienes <span className="text-[#00e5c0]">lo hicieron</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: "🎯", titulo: "Founder-to-founder", desc: "Cada instructor levantó su propia ronda o lideró inversiones reales. Sin teoría vacía." },
              { icon: "🌎", titulo: "100% LatAm", desc: "El contexto importa. Todos entienden los mercados donde operás y los fondos que invierten en la región." },
              { icon: "🤝", titulo: "Red viva", desc: "No un directorio. Una red de personas que se conocen, se referencian y mueven deals activamente." },
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
          ¿Querés acceder a esta red?
        </h2>
        <p className="text-white/50 mb-8">Postulá al programa y conectá directamente con el advisory board.</p>
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
