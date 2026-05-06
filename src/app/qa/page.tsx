import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Q&A — Modo Fundraising 2026",
  description: "Las preguntas más frecuentes sobre el programa.",
};

const FAQ = [
  {
    categoria: "El programa",
    preguntas: [
      {
        q: "¿Qué es exactamente Modo Fundraising?",
        a: "Es un programa de 13 semanas, 100% online, diseñado para founders que están levantando una ronda entre US$500K y US$5M. Cada semana combinamos clases en vivo, sesiones Rockstar (prácticas), masterclasses con expertos y misiones que aplicás directo a tu proceso.",
      },
      {
        q: "¿Cuándo empieza la edición 2026?",
        a: "La edición 2026 arranca el 30 de junio. Las postulaciones cierran el 22 de junio. El programa finaliza con la sesión de Graduation el 1 de octubre.",
      },
      {
        q: "¿Cuánto tiempo requiere por semana?",
        a: "El mínimo comprometido son las 2 clases semanales (martes y jueves, 12:00–13:30 CLT) más el tiempo para completar la misión semanal. En total, entre 5 y 8 horas por semana dependiendo de tu ritmo.",
      },
      {
        q: "¿Las clases son grabadas?",
        a: "Sí. Todas las clases quedan grabadas y disponibles en el portal dentro de las 24hs posteriores a la sesión. También accedés al archivo completo de ediciones anteriores (+80 masterclasses).",
      },
    ],
  },
  {
    categoria: "Admisión",
    preguntas: [
      {
        q: "¿Quién puede postular?",
        a: "Founders que están activamente levantando (o a punto de levantar) una ronda pre-seed, seed o post-seed entre US$500K y US$5M. El programa no es para startups en idea stage ni para empresas que ya cerraron su ronda.",
      },
      {
        q: "¿Cómo es el proceso de admisión?",
        a: "Completás el formulario de postulación, el equipo revisa tu aplicación, y si hay fit agendamos una call de 20 minutos para conocerte. La decisión de admisión llega dentro de los 5 días hábiles.",
      },
      {
        q: "¿Cuántos founders entran por edición?",
        a: "El programa es intencionalmente pequeño. Cada cohorte tiene entre 20 y 30 founders para garantizar calidad en las sesiones Rockstar y atención personalizada.",
      },
      {
        q: "¿Puedo postular si mi startup es de fuera de LatAm?",
        a: "El programa está diseñado con foco en el ecosistema LatAm. Si tu startup opera en LatAm o está levantando con fondos LatAm, hay fit. Si estás en otra región, conversemos en la call de admisión.",
      },
    ],
  },
  {
    categoria: "Precio y pago",
    preguntas: [
      {
        q: "¿Cuánto cuesta el programa?",
        a: "US$349 por mes durante 3 meses (total US$1.047). El pago es mensual y podés cancelar en cualquier momento hasta el segundo mes.",
      },
      {
        q: "¿Aceptan pago anual o único?",
        a: "Por ahora solo ofrecemos plan mensual. Si necesitás un pago único o tenés una situación especial, escribinos a hello@impacta.vc.",
      },
      {
        q: "¿Hay becas o descuentos?",
        a: "En cada edición reservamos 2–3 lugares con descuento para founders en situación de alta necesidad. Si es tu caso, mencionalo en el formulario de postulación.",
      },
    ],
  },
  {
    categoria: "Garantía",
    preguntas: [
      {
        q: "¿Cómo funciona la garantía money back?",
        a: "Tenés 14 días desde tu primer pago para pedir el reembolso sin justificación. El reembolso es sobre el monto neto (post-comisiones de Stripe). No aplica al pago anual.",
      },
      {
        q: "¿Hay requisito de asistencia para el reembolso?",
        a: "No. Si en los primeros 14 días sentís que el programa no es para vos, te devolvemos el dinero. Sin preguntas.",
      },
    ],
  },
  {
    categoria: "Después del programa",
    preguntas: [
      {
        q: "¿Qué acceso tengo después de terminar?",
        a: "Los alumni mantienen acceso de por vida al archivo de masterclasses y al grupo de alumni en WhatsApp. También son invitados a las sesiones anuales de networking con VCs.",
      },
      {
        q: "¿Impacta VC puede invertir en mi startup?",
        a: "Sí. Impacta VC y sus fondos afiliados se reservan el derecho de invertir hasta el 20% de la ronda de startups seleccionadas, sujeto a due diligence, fit de tesis y aprobación interna. No es automático ni obligatorio.",
      },
      {
        q: "¿Me conectan con inversores específicos?",
        a: "El programa provee acceso a una red de inversores, no garantías de inversión. Las conexiones dependen del fit de tu startup con las tesis de los fondos y de tu desempeño durante el programa.",
      },
    ],
  },
];

export default function QAPage() {
  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#00e5c015_0%,_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">Preguntas frecuentes</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              Q<span className="text-[#00e5c0]">&</span>A
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Todo lo que necesitás saber antes de postular. Si tu pregunta no está acá,
              escribinos a{" "}
              <a href="mailto:hello@impacta.vc" className="text-[#00e5c0] hover:underline">hello@impacta.vc</a>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-14">
        {FAQ.map((cat) => (
          <div key={cat.categoria}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#00e5c0] mb-6">{cat.categoria}</h2>
            <div className="space-y-4">
              {cat.preguntas.map((item) => (
                <div
                  key={item.q}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                >
                  <h3 className="font-black text-white mb-3 text-base">{item.q}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Still have questions */}
      <section className="bg-white/5 border-y border-white/10 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-4xl font-black mb-4">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Escribinos directo. Respondemos en menos de 24 horas.
          </p>
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
              className="inline-flex items-center justify-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black px-8 py-4 rounded-xl transition-all"
            >
              WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-black mb-4">
          ¿Listo para <span className="text-[#00e5c0]">postular?</span>
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
