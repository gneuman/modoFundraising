import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Política de Privacidad — Modo Fundraising 2026",
  description:
    "Política de privacidad y tratamiento de datos personales de Modo Fundraising.",
};

export default function PrivacidadPage() {
  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      <section className="max-w-3xl mx-auto px-4 py-20">
        <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-black mb-2">
          Política de Privacidad
        </h1>
        <p className="text-white/40 text-sm mb-12">
          Última actualización: mayo 2026
        </p>

        <div className="space-y-10 text-white/70 leading-relaxed font-[var(--font-questrial)">
          <div>
            <h2 className="text-white font-black text-xl mb-3">
              1. Responsable del tratamiento
            </h2>
            <p>
              Impacta VC SpA (en adelante "Impacta VC"), con domicilio en
              Santiago, Chile, es responsable del tratamiento de los datos
              personales recopilados a través del sitio modofundraising.com y el
              programa Modo Fundraising.
            </p>
            <p className="mt-3">
              Contacto:{" "}
              <a
                href="mailto:amdin@impacta.vc"
                className="text-(--brand-teal) hover:underline"
              >
                amdin@impacta.vc
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              2. Datos que recopilamos
            </h2>
            <p className="mb-3">Recopilamos los siguientes tipos de datos:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                {
                  title: "Datos de postulación",
                  desc: "Nombre, apellido, correo electrónico, WhatsApp, LinkedIn, país, información sobre tu startup (nombre, website, etapa, mercado, tracción, etc.).",
                },
                {
                  title: "Datos de pago",
                  desc: "Procesados por Stripe. No almacenamos datos de tarjetas de crédito. Stripe actúa como procesador independiente bajo sus propios términos.",
                },
                {
                  title: "Datos de uso del portal",
                  desc: "Actividad en el portal del programa: clases vistas, misiones completadas, accesos.",
                },
                {
                  title: "Datos de comunicación",
                  desc: "Correos, mensajes de WhatsApp y Slack intercambiados con el equipo del programa.",
                },
                {
                  title: "Datos técnicos",
                  desc: "Dirección IP, tipo de navegador, dispositivo, páginas visitadas, duración de sesión.",
                },
              ].map(({ title, desc }) => (
                <li
                  key={title}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <span className="text-white font-semibold">{title}:</span>{" "}
                  {desc}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              3. Finalidades del tratamiento
            </h2>
            <p className="mb-3">Usamos tus datos para:</p>
            <ul className="space-y-1 pl-4">
              {[
                "Evaluar tu postulación y comunicarte el resultado",
                "Gestionar tu inscripción y acceso al programa",
                "Procesar pagos y emitir comprobantes",
                "Enviarte contenido del programa (clases, misiones, materiales)",
                "Comunicarte novedades, actualizaciones y próximas ediciones",
                "Mejorar la experiencia del programa",
                "Cumplir obligaciones legales y contables",
              ].map((item) => (
                <li key={item} className="text-white/60 text-sm py-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              4. Base legal del tratamiento
            </h2>
            <p>
              El tratamiento de tus datos se basa en: (a) la ejecución del
              contrato de participación en el Programa, (b) tu consentimiento
              explícito al postular, (c) el interés legítimo de Impacta VC en
              mejorar sus servicios, y (d) el cumplimiento de obligaciones
              legales aplicables.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              5. Compartición de datos con terceros
            </h2>
            <p className="mb-3">
              No vendemos tus datos personales. Podemos compartirlos con:
            </p>
            <ul className="space-y-1 pl-4">
              {[
                "Stripe (procesamiento de pagos)",
                "Airtable (base de datos del programa)",
                "Vercel (hosting del sitio web)",
                "Herramientas de comunicación como WhatsApp Business y Slack",
                "Instructores y mentores del programa (solo nombre, empresa y datos relevantes para el contexto de la sesión)",
                "Autoridades competentes cuando sea requerido por ley",
              ].map((item) => (
                <li key={item} className="text-white/60 text-sm py-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              6. Transferencias internacionales
            </h2>
            <p>
              Algunos proveedores de servicios (Stripe, Airtable, Vercel) operan
              fuera de Chile. Al usar el Programa, aceptás que tus datos puedan
              ser transferidos y procesados en otros países, siempre bajo
              garantías adecuadas de protección.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              7. Retención de datos
            </h2>
            <p>
              Conservamos tus datos mientras seas participante activo y hasta 5
              años después del término de tu participación, salvo que la ley
              exija un período distinto. Los datos de postulaciones no admitidas
              se eliminan a los 12 meses.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              8. Tus derechos
            </h2>
            <p className="mb-3">Tenés derecho a:</p>
            <ul className="space-y-1 pl-4">
              {[
                "Acceder a los datos que tenemos sobre vos",
                "Rectificar datos incorrectos o incompletos",
                "Solicitar la eliminación de tus datos (derecho al olvido)",
                "Oponerte al tratamiento para fines de marketing",
                "Portabilidad de tus datos en formato estructurado",
                "Retirar tu consentimiento en cualquier momento",
              ].map((item) => (
                <li key={item} className="text-white/60 text-sm py-1">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, escribí a{" "}
              <a
                href="mailto:amdin@impacta.vc"
                className="text-(--brand-teal) hover:underline"
              >
                amdin@impacta.vc
              </a>{" "}
              con el asunto "Derechos ARCO".
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              9. Cookies y tecnologías de seguimiento
            </h2>
            <p>
              Usamos cookies para mejorar la experiencia del sitio. Podés
              consultar nuestra{" "}
              <Link
                href="/cookies"
                className="text-(--brand-teal) hover:underline"
              >
                Política de Cookies
              </Link>{" "}
              para más información.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              10. Seguridad
            </h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus
              datos: conexiones HTTPS, acceso restringido a datos sensibles, y
              proveedores con certificaciones de seguridad (Stripe PCI DSS,
              Vercel SOC 2). Sin embargo, ningún sistema es 100% seguro y no
              podemos garantizar la seguridad absoluta de la información
              transmitida.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              11. Menores de edad
            </h2>
            <p>
              El Programa está dirigido a founders mayores de 18 años. No
              recopilamos intencionalmente datos de menores. Si detectamos que
              un menor nos proporcionó datos sin consentimiento parental, los
              eliminaremos de inmediato.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              12. Cambios a esta política
            </h2>
            <p>
              Podemos actualizar esta política periódicamente. Te notificaremos
              cambios relevantes por correo electrónico. La versión vigente
              siempre estará disponible en esta página con la fecha de última
              actualización.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">13. Contacto</h2>
            <p>
              <a
                href="mailto:amdin@impacta.vc"
                className="text-(--brand-teal) hover:underline"
              >
                amdin@impacta.vc
              </a>{" "}
              · Impacta VC SpA · Santiago, Chile.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
