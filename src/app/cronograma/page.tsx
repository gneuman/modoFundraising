import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Cronograma — Modo Fundraising 2026",
  description: "14 semanas, 26 clases, 4 fases. El programa completo para levantar tu ronda.",
};

const FASES = [
  {
    id: "fase1",
    label: "Fase 1",
    titulo: "Get Ready & Sexy",
    semanas: "Semanas 1–5",
    color: "#00e5c0",
    clases: [
      { nro: 1, titulo: "Program Launch", tipo: "Teoría", fecha: "30 Jun", semana: 1, expositor: "David Alvo", desc: "Bienvenida oficial, roadmap 2026 y alineación de la disciplina de levantamiento." },
      { nro: 2, titulo: "Rockstar Launch", tipo: "Rockstar", fecha: "2 Jul", semana: 1, desc: "Presentaciones del grupo y primeros pasos en el programa." },
      { nro: 3, titulo: "Fundraising Techstack", tipo: "Teoría", fecha: "7 Jul", semana: 2, expositor: "David Alvo", desc: "CRM de inversores, herramientas de tracking y automatización." },
      { nro: 4, titulo: "Rockstar Techstack", tipo: "Rockstar", fecha: "9 Jul", semana: 2, desc: "Configuración de herramientas y CRM en vivo." },
      { nro: 5, titulo: "Fundraising Strategy", tipo: "Teoría", fecha: "14 Jul", semana: 3, expositor: "David Alvo", desc: "Diseño de ronda, tesis de inversión, unit economics y uso de fondos." },
      { nro: 6, titulo: "Rockstar Strategy", tipo: "Rockstar", fecha: "16 Jul", semana: 3, desc: "Revisión de estrategia de ronda de cada startup." },
      { nro: 7, titulo: "Founder Storytelling", tipo: "Teoría", fecha: "21 Jul", semana: 4, expositor: "Yoel Chlimper", desc: "Narrativa del fundador y visión de la compañía para generar conexión emocional con el VC." },
      { nro: 8, titulo: "Rockstar Storytelling", tipo: "Rockstar", fecha: "23 Jul", semana: 4, desc: "Trabajo en narrativa y pitch del fundador." },
      { nro: 9, titulo: "Mastering Pitch Decks", tipo: "Teoría", fecha: "28 Jul", semana: 5, expositor: "David Alvo", desc: "Slides clave, Data Room y preparación para las primeras reuniones." },
      { nro: 10, titulo: "Rockstar Pitch Decks", tipo: "Rockstar", fecha: "30 Jul", semana: 5, desc: "Revisión de pitch decks y data rooms." },
    ],
  },
  {
    id: "fase2",
    label: "Fase 2",
    titulo: "Approach & Connect",
    semanas: "Semanas 6–9",
    color: "#0d6efd",
    clases: [
      { nro: 11, titulo: "Investor Research", tipo: "Teoría", fecha: "4 Ago", semana: 6, expositor: "David Alvo", desc: "Identificación y calificación de fondos por tesis, etapa y geografía." },
      { nro: 12, titulo: "Rockstar Research", tipo: "Rockstar", fecha: "6 Ago", semana: 6, desc: "Construcción de target lists de inversores." },
      { nro: 13, titulo: "Investor Approach", tipo: "Teoría", fecha: "11 Ago", semana: 7, expositor: "Nathan B.", desc: "Cold outreach, correos de alto impacto y gestión estratégica del follow-up." },
      { nro: 14, titulo: "Rockstar Approach", tipo: "Rockstar", fecha: "13 Ago", semana: 7, desc: "Redacción de templates de outreach." },
      { nro: 15, titulo: "Networks", tipo: "Teoría", fecha: "18 Ago", semana: 8, expositor: "David Alvo", desc: "Mapeo y activación de nodos de confianza para warm intros." },
      { nro: 16, titulo: "Rockstar Networks", tipo: "Rockstar", fecha: "20 Ago", semana: 8, desc: "Mapeo de red y solicitudes de intro." },
      { nro: 17, titulo: "Connections", tipo: "Teoría", fecha: "25 Ago", semana: 9, expositor: "David Alvo", desc: "Gestión de intro calls, validación de interés y manejo de objeciones." },
      { nro: 18, titulo: "Rockstar Connections", tipo: "Rockstar", fecha: "27 Ago", semana: 9, desc: "Roleplay de intro calls y manejo de objeciones." },
    ],
  },
  {
    id: "fase3",
    label: "Fase 3",
    titulo: "Manage Momentum",
    semanas: "Semanas 10–12",
    color: "#f59e0b",
    clases: [
      { nro: 19, titulo: "Managing Momentum", tipo: "Teoría", fecha: "1 Sep", semana: 10, expositor: "David Alvo", desc: "Creación de hitos de tracción para mover inversores del 'quizás' al 'sí'." },
      { nro: 20, titulo: "Rockstar Momentum", tipo: "Rockstar", fecha: "3 Sep", semana: 10, desc: "Construcción del plan de momentum." },
      { nro: 21, titulo: "Lead Investor", tipo: "Teoría", fecha: "8 Sep", semana: 11, expositor: "David Alvo", desc: "Conseguir al inversor principal, valuación y revisión de term sheets." },
      { nro: 22, titulo: "Rockstar Lead", tipo: "Rockstar", fecha: "10 Sep", semana: 11, desc: "Análisis de term sheets y negociación de valuación." },
      { nro: 23, titulo: "FOMO", tipo: "Teoría", fecha: "22 Sep", semana: 12, expositor: "David Alvo", desc: "Psicología del inversor para generar urgencia, escasez y competencia sana entre fondos." },
      { nro: 24, titulo: "Rockstar FOMO", tipo: "Rockstar", fecha: "24 Sep", semana: 12, desc: "Diseño de estrategia FOMO y cierre de ronda." },
    ],
  },
  {
    id: "fase4",
    label: "Fase 4",
    titulo: "Closing the Round",
    semanas: "Semanas 13–14",
    color: "#10b981",
    clases: [
      { nro: 25, titulo: "Closing Round", tipo: "Teoría", fecha: "29 Sep", semana: 13, expositor: "David Alvo", desc: "Cierre legal, firmas, Due Diligence final y relación post-closing." },
      { nro: 26, titulo: "Graduation", tipo: "Graduation", fecha: "1 Oct", semana: 14, desc: "Presentación final ante VCs invitados y ceremonia de cierre del programa." },
    ],
  },
];

const TIPO_COLORS: Record<string, string> = {
  Teoría: "bg-(--brand-teal)/15 text-(--brand-teal) border-(--brand-teal)/30",
  Rockstar: "bg-(--brand-blue)/15 text-(--brand-blue-light) border-(--brand-blue)/30",
  Graduation: "bg-(--brand-amber)/15 text-(--brand-amber) border-(--brand-amber)/30",
};

export default function CronogramaPage() {
  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-(--brand-navy) via-(--brand-navy-mid) to-(--brand-navy)" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">Programa 2026</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Cronograma <span className="text-(--brand-teal)">completo</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              14 semanas · 26 clases · 4 fases · 100% online.<br />
              Inicio: <strong className="text-white">30 de junio, 2026</strong> · Horario: <strong className="text-white">12:00–13:30 (CLT)</strong>
            </p>

            {/* Resumen de 4 fases */}
            <div className="flex flex-wrap gap-2 mb-6">
              {FASES.map((f) => (
                <a
                  key={f.id}
                  href={`#${f.id}`}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors hover:opacity-80"
                  style={{ color: f.color, borderColor: `${f.color}40`, backgroundColor: `${f.color}15` }}
                >
                  {f.label} · {f.titulo}
                </a>
              ))}
            </div>

            {/* Leyenda de tipos */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Teoría", color: "bg-(--brand-teal)/15 text-(--brand-teal) border border-(--brand-teal)/30" },
                { label: "Rockstar (sesión práctica)", color: "bg-(--brand-blue)/15 text-(--brand-blue-light) border border-(--brand-blue)/30" },
                { label: "Graduation", color: "bg-(--brand-amber)/15 text-(--brand-amber) border border-(--brand-amber)/30" },
              ].map(({ label, color }) => (
                <span key={label} className={`text-xs font-semibold px-3 py-1 rounded-full ${color}`}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fases */}
      <section className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        {FASES.map((fase) => (
          <div key={fase.id} id={fase.id}>
            {/* Fase header */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-1 h-12 rounded-full"
                style={{ backgroundColor: fase.color }}
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: fase.color }}>{fase.label} · {fase.semanas}</p>
                <h2 className="text-3xl md:text-4xl font-black text-white">{fase.titulo}</h2>
              </div>
            </div>

            {/* Grid de clases */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fase.clases.map((clase) => (
                <div
                  key={clase.nro}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-white/30 text-xs font-mono">S{clase.nro.toString().padStart(2, "0")}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIPO_COLORS[clase.tipo]}`}>
                      {clase.tipo}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base leading-tight">{clase.titulo}</h3>
                    <p className="text-white/50 text-xs mt-1">{clase.fecha} · Semana {clase.semana}</p>
                  </div>
                  <p className="text-white/60 text-xs leading-relaxed flex-1">{clase.desc}</p>
                  {clase.expositor && (
                    <p className="text-white/40 text-xs border-t border-white/10 pt-2">{clase.expositor}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            ¿Listo para <span className="text-(--brand-teal)">empezar?</span>
          </h2>
          <p className="text-white/50 mb-8 text-lg">Postulaciones abiertas hasta el 22 de junio de 2026.</p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 bg-(--brand-teal) hover:bg-(--brand-teal-dark) text-(--brand-navy) font-black text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
          >
            Postular ahora →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
