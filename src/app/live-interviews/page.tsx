import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getLiveInterviews, type LiveInterview } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "Live Interviews — Modo Fundraising 2026",
  description: "Entrevistas en vivo con founders e inversores reales de LatAm. Sin filtros, sin PR.",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const ESTADO_STYLES: Record<string, string> = {
  Abierto: "bg-(--brand-teal)/15 text-(--brand-teal) border-(--brand-teal)/30",
  Exclusivo: "bg-(--brand-violet)/15 text-(--brand-violet-light) border-(--brand-violet)/30",
  Próximo: "bg-white/10 text-white/50 border-white/20",
};

export default async function LiveInterviewsPage() {
  const interviews = await getLiveInterviews().catch(() => [] as LiveInterview[]);

  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-(--brand-navy) via-(--brand-navy-mid) to-(--brand-navy)" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">Sesiones semanales · 2026</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Live <span className="text-(--brand-teal)">Interviews</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-6">
              Cada semana, un founder o inversor real en conversación abierta con David Alvo.
              Sin guión, sin PR, sin respuestas ensayadas.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Sesiones en vivo", "Grabadas y disponibles", "Q&A abierto"].map((item) => (
                <span key={item} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm font-semibold text-white">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        {interviews.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — las entrevistas se están confirmando.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {interviews.map((li, idx) => (
              <div
                key={li.id ?? li.titulo}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-(--brand-teal)/30 hover:bg-(--brand-teal)/5 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-white/30 text-xs font-mono">LI{String(idx + 1).padStart(2, "0")}</span>
                  {li.estado && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ESTADO_STYLES[li.estado] ?? ESTADO_STYLES["Próximo"]}`}>
                      {li.estado}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {li.entrevistado_foto_url ? (
                    <Image
                      src={li.entrevistado_foto_url}
                      alt={li.entrevistado_nombre}
                      width={40}
                      height={40}
                      className="rounded-full object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-(--brand-teal)/20 border border-(--brand-teal)/30 flex items-center justify-center text-xs font-black text-(--brand-teal) flex-shrink-0">
                      {initials(li.entrevistado_nombre ?? "?")}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-white text-sm leading-tight">{li.titulo}</h3>
                    {li.fecha && <p className="text-white/40 text-xs mt-0.5">{li.fecha}{li.duracion_min ? ` · ${li.duracion_min} min` : ""}</p>}
                  </div>
                </div>

                {li.aprendizaje_gratis && (
                  <p className="text-white/60 text-xs leading-relaxed flex-1">{li.aprendizaje_gratis}</p>
                )}

                <div className="border-t border-white/10 pt-2">
                  <p className="text-(--brand-teal) text-xs font-semibold">{li.entrevistado_nombre}</p>
                  {li.entrevistado_cargo && (
                    <p className="text-white/40 text-xs">{li.entrevistado_cargo}{li.entrevistado_empresa ? ` · ${li.entrevistado_empresa}` : ""}</p>
                  )}
                  {li.tema && <p className="text-white/30 text-xs mt-1">{li.tema}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Propuesta de valor */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-10 text-center">Por qué son <span className="text-(--brand-teal)">diferentes</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎙️", titulo: "Sin filtros", desc: "Las preguntas las hacen los founders del programa. No hay temas prohibidos ni respuestas ensayadas." },
              { icon: "📚", titulo: "Casos reales", desc: "Cada speaker viene con números, emails, decks y procesos reales — no con genéricos ni teoría." },
              { icon: "🎬", titulo: "Acceso permanente", desc: "Todas las sesiones quedan grabadas. Alumni de ediciones anteriores tienen acceso al archivo completo." },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="bg-(--brand-navy) border border-white/10 rounded-2xl p-6 text-center hover:border-(--brand-teal)/30 transition-all">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-black text-(--brand-teal) mb-2">{titulo}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          Accedé a todas las <span className="text-(--brand-teal)">sesiones en vivo</span>
        </h2>
        <p className="text-white/50 mb-8">Solo para alumnos del programa. Postulá para entrar.</p>
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
