import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getHouseRules, type HouseRule } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "House Rules — Modo Fundraising 2026",
  description: "Las reglas que hacen que el programa funcione para todos.",
};

export default async function HouseRulesPage() {
  const rules = await getHouseRules().catch(() => [] as HouseRule[]);

  // Group by categoria
  const categorias = Array.from(new Set(rules.map((r) => r.categoria))).filter(Boolean);
  const grouped = categorias.map((cat) => ({
    categoria: cat,
    reglas: rules.filter((r) => r.categoria === cat),
  }));

  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-(--brand-navy) via-(--brand-navy-mid) to-(--brand-navy)" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#00e5c015_0%,_transparent_50%)" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">El contrato social del programa</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              House <span className="text-(--brand-teal)">Rules</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Modo Fundraising funciona porque todos juegan con las mismas reglas.
              Estas no son restricciones — son los acuerdos que hacen que valga la pena estar aquí.
            </p>
          </div>
        </div>
      </section>

      {/* Leyenda */}
      <section className="border-y border-white/10 py-5">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-4 items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-(--brand-teal)" />
            <span className="text-white/50">Obligatoria — incumplimiento puede resultar en expulsión</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/20" />
            <span className="text-white/50">Recomendada — para tu propio beneficio</span>
          </div>
        </div>
      </section>

      {/* Reglas */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-14">
        {rules.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — las reglas se están cargando.</p>
        ) : grouped.length > 0 ? (
          grouped.map((cat) => (
            <div key={cat.categoria}>
              <div className="flex items-center gap-3 mb-6">
                {cat.reglas[0]?.icono && <span className="text-2xl">{cat.reglas[0].icono}</span>}
                <h2 className="text-xs font-bold uppercase tracking-widest text-(--brand-teal)">{cat.categoria}</h2>
              </div>
              <RulesGrid reglas={cat.reglas} />
            </div>
          ))
        ) : (
          <RulesGrid reglas={rules} />
        )}
      </section>

      {/* Closing note */}
      <section className="bg-white/5 border-y border-white/10 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">🤜🤛</div>
          <h2 className="text-3xl font-black mb-4">El trato</h2>
          <p className="text-white/60 leading-relaxed font-[var(--font-questrial)">
            Nosotros ponemos el contenido, la red y los inversores.
            Tú pones el trabajo, la honestidad y el respeto.
            Así funciona esto.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function RulesGrid({ reglas }: { reglas: HouseRule[] }) {
  return (
    <div className="space-y-4">
      {reglas.map((regla, idx) => (
        <div
          key={regla.id ?? idx}
          className={`bg-white/5 border rounded-2xl p-6 transition-all ${
            regla.activa
              ? "border-(--brand-teal)/20 hover:border-(--brand-teal)/40"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${regla.activa ? "bg-(--brand-teal)" : "bg-white/20"}`} />
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {regla.icono && <span className="text-lg">{regla.icono}</span>}
                <h3 className="font-black text-white text-base">{regla.titulo}</h3>
                {regla.activa && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-(--brand-teal)/15 text-(--brand-teal) border border-(--brand-teal)/30 font-semibold flex-shrink-0">
                    Obligatoria
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm leading-relaxed font-[var(--font-questrial)">{regla.descripcion}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
