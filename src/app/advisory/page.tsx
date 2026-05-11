import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getAdvisors, type Advisor } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "Advisory Board — Modo Fundraising 2026",
  description: "Los mejores founders e inversores de LatAm que guían el programa.",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function AdvisoryPage() {
  const advisors = await getAdvisors().catch(() => [] as Advisor[]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": advisors.map((a) => ({
      "@type": "Person",
      name: a.nombre,
      jobTitle: a.cargo,
      description: a.track_record,
      url: "https://modofundraising.com/advisory",
      ...(a.foto_url ? { image: a.foto_url } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="bg-[var(--brand-navy)] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[var(--brand-navy)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#00e5c015_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[var(--brand-teal)] text-sm font-bold uppercase tracking-widest mb-4">El equipo detrás del programa</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Advisory <span className="text-[var(--brand-teal)]">Board</span>
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
        {advisors.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — el advisory board se está confirmando.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {advisors.map((a) => (
              <div
                key={a.id ?? a.nombre}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[var(--brand-teal)]/30 hover:bg-[var(--brand-teal)]/5 transition-all flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  {a.foto_url ? (
                    <Image
                      src={a.foto_url}
                      alt={a.nombre}
                      width={56}
                      height={56}
                      className="rounded-full object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[var(--brand-teal)]/20 border border-[var(--brand-teal)]/30 flex items-center justify-center text-lg font-black text-[var(--brand-teal)] flex-shrink-0">
                      {initials(a.nombre)}
                    </div>
                  )}
                  <div>
                    <div className="font-black text-white">{a.nombre}</div>
                    <div className="text-white/50 text-xs">{a.cargo}</div>
                    <div className="text-[var(--brand-teal)] text-xs font-semibold">{a.especialidad}</div>
                  </div>
                </div>
                <p className="text-white/60 text-sm leading-relaxed flex-1">{a.track_record}</p>
                <div className="text-white/40 text-xs border-t border-white/10 pt-3 space-y-1">
                  {a.ideal_para && <p><span className="text-white/30">Ideal para:</span> {a.ideal_para}</p>}
                  {a.formato && <p><span className="text-white/30">Formato:</span> {a.formato}</p>}
                  {a.modalidad && <p><span className="text-white/30">Modalidad:</span> {a.modalidad}</p>}
                  {a.pricing_display && <p className="text-[var(--brand-teal)] font-semibold">{a.pricing_display}</p>}
                </div>
                {a.calendly_url && (
                  <a
                    href={a.calendly_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-xs font-bold border border-[var(--brand-teal)]/30 text-[var(--brand-teal)] rounded-lg py-2 hover:bg-[var(--brand-teal)]/10 transition-colors"
                  >
                    Agendar sesión →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Propuesta de valor */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-center">
            Aprende de quienes <span className="text-[var(--brand-teal)]">lo hicieron</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: "🎯", titulo: "Founder-to-founder", desc: "Cada instructor levantó su propia ronda o lideró inversiones reales. Sin teoría vacía." },
              { icon: "🌎", titulo: "100% LatAm", desc: "El contexto importa. Todos entienden los mercados donde operás y los fondos que invierten en la región." },
              { icon: "🤝", titulo: "Red viva", desc: "No un directorio. Una red de personas que se conocen, se referencian y mueven deals activamente." },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="bg-[var(--brand-navy)] border border-white/10 rounded-2xl p-6 text-center hover:border-[var(--brand-teal)]/30 transition-all">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-black text-[var(--brand-teal)] mb-2">{titulo}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">¿Querés acceder a esta red?</h2>
        <p className="text-white/50 mb-8">Postulá al programa y conectá directamente con el advisory board.</p>
        <Link
          href="/apply"
          className="inline-flex items-center gap-2 bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-dark)] text-[var(--brand-navy)] font-black text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
        >
          Postular ahora →
        </Link>
      </section>

      <Footer />
    </div>
    </>
  );
}
