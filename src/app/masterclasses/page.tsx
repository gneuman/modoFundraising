import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getMasterclasses, type Masterclass } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "Masterclasses — Modo Fundraising 2026",
  description: "Sesiones especiales con los mejores inversores y founders de LatAm.",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const ESTADO_STYLES: Record<string, string> = {
  Abierto: "bg-[#00e5c0]/15 text-[#00e5c0] border-[#00e5c0]/30",
  Exclusivo: "bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/30",
  Próximo: "bg-white/10 text-white/50 border-white/20",
};

export default async function MasterclassesPage() {
  const masterclasses = await getMasterclasses().catch(() => [] as Masterclass[]);

  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#00e5c015_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">Sesiones especiales · 2026</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Master<span className="text-[#00e5c0]">classes</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Además de las clases del programa, cada edición trae speakers externos: founders que levantaron rondas reales,
              GPs con deal flow activo, y expertos en los temas más duros del proceso.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {["80+ masterclasses históricas", "Grabadas y disponibles", "Speakers LatAm y globales"].map((item) => (
                <span key={item} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm font-semibold text-white">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid masterclasses */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black mb-2">Masterclasses <span className="text-[#00e5c0]">MF26</span></h2>
        <p className="text-white/50 mb-10">Edición 2026 · Calendario tentativo sujeto a confirmación de speakers.</p>

        {masterclasses.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — las masterclasses se están confirmando.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {masterclasses.map((mc, idx) => (
              <div
                key={mc.id ?? mc.titulo}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 hover:bg-[#00e5c0]/5 transition-all flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  {mc.thumbnail_url ? (
                    <Image
                      src={mc.thumbnail_url}
                      alt={mc.titulo}
                      width={48}
                      height={48}
                      className="rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#00e5c0]/20 border border-[#00e5c0]/30 flex items-center justify-center text-sm font-black text-[#00e5c0] flex-shrink-0">
                      {initials(mc.speaker ?? mc.partner ?? "MC")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/30 text-xs font-mono">MC{String(idx + 1).padStart(2, "0")}</span>
                      {mc.tema && <span className="text-white/30 text-xs">· {mc.tema}</span>}
                    </div>
                    <h3 className="font-black text-white text-base leading-tight">{mc.titulo}</h3>
                    <p className="text-[#00e5c0] text-xs font-semibold mt-0.5">{mc.speaker}</p>
                  </div>
                  {mc.estado && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${ESTADO_STYLES[mc.estado] ?? ESTADO_STYLES["Próximo"]}`}>
                      {mc.estado}
                    </span>
                  )}
                </div>
                {mc.insight_gratis && (
                  <p className="text-white/60 text-sm leading-relaxed flex-1">{mc.insight_gratis}</p>
                )}
                <div className="flex items-center justify-between text-xs text-white/30 border-t border-white/10 pt-3">
                  {mc.fecha && <span>{mc.fecha}</span>}
                  {mc.duracion_min && <span>{mc.duracion_min} min</span>}
                  {mc.partner && <span>{mc.partner}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Archivo histórico */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-4xl font-black mb-4">
            +80 masterclasses <span className="text-[#00e5c0]">grabadas</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            Todos los alumnos del programa acceden al archivo histórico completo de ediciones anteriores.
            Desde pitch critique en vivo hasta AMAs con GPs de fondos como Kaszek, ALLVP y a16z Emerging.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {[
              { value: "80+", label: "Masterclasses grabadas" },
              { value: "40+", label: "Speakers distintos" },
              { value: "3", label: "Ediciones anteriores" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-4xl font-black text-[#00e5c0]">{value}</div>
                <div className="text-white/50 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          Accedé al archivo <span className="text-[#00e5c0]">completo</span>
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
