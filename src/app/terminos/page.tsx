import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Términos y Condiciones — Modo Fundraising 2026",
  description: "Términos y condiciones del programa Modo Fundraising 2026.",
};

export default function TerminosPage() {
  return (
    <div className="bg-[var(--brand-navy)] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      <section className="max-w-3xl mx-auto px-4 py-20">
        <p className="text-[var(--brand-teal)] text-sm font-bold uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl md:text-5xl font-black mb-2">Términos y Condiciones</h1>
        <p className="text-white/40 text-sm mb-12">Última actualización: mayo 2026</p>

        <div className="space-y-10 text-white/70 leading-relaxed font-[var(--font-questrial)]">

          <div>
            <h2 className="text-white font-black text-xl mb-3">1. Aceptación de los términos</h2>
            <p>Al postular, inscribirse o participar en el programa Modo Fundraising (en adelante "el Programa"), operado por Impacta VC SpA (en adelante "Impacta VC"), aceptás íntegramente estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debés participar en el Programa.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">2. Descripción del programa</h2>
            <p>Modo Fundraising es un programa de educación y mentoría de 13 semanas, 100% online, dirigido a founders que están levantando rondas de financiamiento entre US$500K y US$5M. El Programa incluye clases en vivo, sesiones prácticas (Rockstar), masterclasses con expertos, misiones semanales y acceso a una red de inversores.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">3. Proceso de admisión</h2>
            <p>La participación en el Programa está sujeta a un proceso de admisión. Impacta VC se reserva el derecho de aceptar o rechazar postulaciones sin necesidad de justificación. El pago no garantiza la admisión — el proceso de selección ocurre previo al cobro.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">4. Precio y forma de pago</h2>
            <p>El valor del Programa es de US$349 por mes, con un total de 3 cuotas mensuales (US$1.047 en total). Los pagos se procesan mediante Stripe. Los precios están expresados en dólares estadounidenses. Los impuestos aplicables según la jurisdicción del participante son responsabilidad del mismo.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">5. Garantía de devolución</h2>
            <p>Los participantes tienen 14 días calendario desde la fecha del primer pago para solicitar un reembolso completo, sin necesidad de justificación. El reembolso se procesa sobre el monto neto recibido por Impacta VC, descontando las comisiones de procesamiento de Stripe (aproximadamente 2.9% + US$0.30). La garantía no aplica a pagos únicos o anuales en caso de que se ofrezcan en el futuro.</p>
            <p className="mt-3">Para solicitar el reembolso, escribí a <a href="mailto:hello@impacta.vc" className="text-[var(--brand-teal)] hover:underline">hello@impacta.vc</a> desde el correo registrado en el Programa.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">6. Cancelación</h2>
            <p>Podés cancelar tu participación en cualquier momento. La cancelación detiene futuros cobros pero no genera reembolso de los meses ya pagados (salvo dentro del período de garantía de 14 días del primer pago). Para cancelar, escribí a <a href="mailto:hello@impacta.vc" className="text-[var(--brand-teal)] hover:underline">hello@impacta.vc</a>.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">7. Propiedad intelectual</h2>
            <p>Todo el contenido del Programa — clases, materiales, presentaciones, metodologías y recursos — es propiedad de Impacta VC o de los expertos invitados respectivos. Está prohibida la reproducción, distribución, grabación no autorizada o comercialización de cualquier parte del contenido sin autorización expresa y por escrito de Impacta VC.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">8. Derecho de inversión de Impacta VC</h2>
            <p>Impacta VC y sus fondos afiliados se reservan el derecho de invertir hasta el 20% de la ronda de capital de startups seleccionadas que participen o hayan participado en el Programa. Este derecho está sujeto a due diligence, fit con la tesis de inversión vigente y aprobación interna del comité de inversiones. La participación en el Programa no implica compromiso de inversión de parte de Impacta VC.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">9. Limitación de responsabilidad</h2>
            <p>Impacta VC no garantiza resultados específicos de fundraising. El éxito en levantar capital depende de múltiples factores fuera del control del Programa, incluyendo condiciones de mercado, tracción de la startup y decisiones de inversores. El Programa provee educación, herramientas y red — no garantías de financiamiento.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">10. Privacidad</h2>
            <p>El tratamiento de tus datos personales está regulado por nuestra <Link href="/privacidad" className="text-[var(--brand-teal)] hover:underline">Política de Privacidad</Link>.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">11. Conducta de los participantes</h2>
            <p>Los participantes se comprometen a mantener una conducta respetuosa con el equipo, los instructores y los demás founders del programa. Impacta VC se reserva el derecho de remover del Programa, sin reembolso, a cualquier participante que incurra en conductas inapropiadas, acoso, difusión no autorizada de contenido o violación de estos términos.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">12. Modificaciones</h2>
            <p>Impacta VC se reserva el derecho de modificar estos términos con previo aviso de 15 días a los participantes activos. El uso continuado del Programa tras la notificación implica aceptación de los cambios.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">13. Ley aplicable y jurisdicción</h2>
            <p>Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa será sometida a los tribunales competentes de Santiago de Chile.</p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">14. Contacto</h2>
            <p>Para consultas sobre estos términos: <a href="mailto:hello@impacta.vc" className="text-[var(--brand-teal)] hover:underline">hello@impacta.vc</a> · Impacta VC SpA · Santiago, Chile.</p>
          </div>

        </div>
      </section>
      <Footer />
    </div>
  );
}
