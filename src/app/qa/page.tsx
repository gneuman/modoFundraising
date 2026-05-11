import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";
import { getQA, type QAItem, type QACategoria } from "@/lib/airtable";

export const revalidate = 900;

export const metadata = {
  title: "Q&A — Modo Fundraising 2026",
  description: "Las preguntas más frecuentes sobre el programa.",
};

const CATEGORIAS: QACategoria[] = ["Programa", "Logística", "Pago", "Selección", "Post-programa"];

export default async function QAPage() {
  const items = await getQA().catch(() => [] as QAItem[]);

  // Group by category, preserving order
  const grouped = CATEGORIAS.map((cat) => ({
    categoria: cat,
    preguntas: items.filter((i) => i.categoria === cat),
  })).filter((g) => g.preguntas.length > 0);

  const jsonLd = items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.pregunta,
      acceptedAnswer: { "@type": "Answer", text: i.respuesta },
    })),
  } : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    <div className="bg-[var(--brand-navy)] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[var(--brand-navy)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#00e5c015_0%,_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[var(--brand-teal)] text-sm font-bold uppercase tracking-widest mb-4">Preguntas frecuentes</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Q<span className="text-[var(--brand-teal)]">&</span>A
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Todo lo que necesitás saber antes de postular. Si tu pregunta no está acá,
              escribinos a{" "}
              <a href="mailto:hello@impacta.vc" className="text-[var(--brand-teal)] hover:underline">hello@impacta.vc</a>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-14">
        {grouped.length === 0 ? (
          <p className="text-white/40 text-center py-20">Próximamente — las preguntas se están cargando.</p>
        ) : (
          grouped.map((cat) => (
            <div key={cat.categoria}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--brand-teal)] mb-6">{cat.categoria}</h2>
              <div className="space-y-4">
                {cat.preguntas.map((item) => (
                  <div
                    key={item.id ?? item.pregunta}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                  >
                    <h3 className="font-black text-white mb-3 text-base">{item.pregunta}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{item.respuesta}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Still have questions */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-4xl font-black mb-4">¿No encontraste lo que buscabas?</h2>
          <p className="text-white/60 text-lg mb-8">Escribinos directo. Respondemos en menos de 24 horas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@impacta.vc"
              className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              hello@impacta.vc
            </a>
            <a
              href="https://wa.me/56912345678?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20Modo%20Fundraising%202026"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-dark)] text-[var(--brand-navy)] font-black px-8 py-4 rounded-xl transition-all"
            >
              WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          ¿Listo para <span className="text-[var(--brand-teal)]">postular?</span>
        </h2>
        <p className="text-white/50 mb-8">Postulaciones abiertas hasta el 22 de junio de 2026.</p>
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
