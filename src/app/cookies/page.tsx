import Link from "next/link";
import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "Política de Cookies — Modo Fundraising 2026",
  description:
    "Política de cookies y tecnologías de seguimiento de Modo Fundraising.",
};

const COOKIES = [
  {
    nombre: "__session / auth cookies",
    tipo: "Esencial",
    origen: "Propio",
    duracion: "Sesión",
    proposito: "Mantener la sesión iniciada en el portal del programa.",
  },
  {
    nombre: "_vercel_jwt",
    tipo: "Esencial",
    origen: "Vercel",
    duracion: "1 hora",
    proposito: "Autenticación de previsualizaciones protegidas de Vercel.",
  },
  {
    nombre: "__stripe_mid / __stripe_sid",
    tipo: "Funcional",
    origen: "Stripe",
    duracion: "1 año / sesión",
    proposito: "Detección de fraude y seguridad en el procesamiento de pagos.",
  },
  {
    nombre: "_ga / _gid",
    tipo: "Analítica",
    origen: "Google Analytics",
    duracion: "2 años / 24 hs",
    proposito:
      "Medir visitas, páginas vistas y comportamiento general de usuarios en el sitio.",
  },
  {
    nombre: "fbp / fbc",
    tipo: "Marketing",
    origen: "Meta (Facebook)",
    duracion: "90 días",
    proposito:
      "Atribución de conversiones de campañas publicitarias en Facebook e Instagram.",
  },
];

export default function CookiesPage() {
  return (
    <div className="bg-(--brand-navy) text-white min-h-screen font-[var(--font-montserrat)">
      <Nav />

      <section className="max-w-3xl mx-auto px-4 py-20">
        <p className="text-(--brand-teal) text-sm font-bold uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-black mb-2">
          Política de Cookies
        </h1>
        <p className="text-white/40 text-sm mb-12">
          Última actualización: mayo 2026
        </p>

        <div className="space-y-10 text-white/70 leading-relaxed font-[var(--font-questrial)">
          <div>
            <h2 className="text-white font-black text-xl mb-3">
              ¿Qué son las cookies?
            </h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web
              guardan en tu dispositivo cuando los visitás. Permiten que el
              sitio recuerde información sobre tu visita — como tus preferencias
              o si ya iniciaste sesión — lo que hace que la próxima visita sea
              más fácil y el sitio más útil para vos.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              Tipos de cookies que usamos
            </h2>

            <div className="space-y-3 mb-6">
              {[
                {
                  tipo: "Esenciales",
                  color:
                    "bg-(--brand-teal)/15 text-(--brand-teal) border-(--brand-teal)/30",
                  desc: "Necesarias para que el sitio funcione. Sin ellas, partes del sitio no funcionarían correctamente. No se pueden desactivar.",
                },
                {
                  tipo: "Funcionales",
                  color:
                    "bg-(--brand-blue-light)/15 text-(--brand-blue-light) border-(--brand-blue-light)/30",
                  desc: "Mejoran la funcionalidad del sitio recordando tus elecciones.",
                },
                {
                  tipo: "Analítica",
                  color:
                    "bg-(--brand-amber)/15 text-(--brand-amber) border-(--brand-amber)/30",
                  desc: "Nos ayudan a entender cómo los visitantes interactúan con el sitio. Toda la información es anonimizada.",
                },
                {
                  tipo: "Marketing",
                  color:
                    "bg-(--brand-red)/15 text-(--brand-red) border-(--brand-red)/30",
                  desc: "Se usan para mostrar publicidad relevante. Podés optar por no recibirlas.",
                },
              ].map(({ tipo, color, desc }) => (
                <div key={tipo} className="flex gap-3 items-start">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 mt-0.5 ${color}`}
                  >
                    {tipo}
                  </span>
                  <p className="text-sm text-white/60">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-4">
              Cookies específicas que usamos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 text-white/50 font-semibold text-xs uppercase tracking-wider">
                      Cookie
                    </th>
                    <th className="text-left py-3 pr-4 text-white/50 font-semibold text-xs uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-left py-3 pr-4 text-white/50 font-semibold text-xs uppercase tracking-wider">
                      Origen
                    </th>
                    <th className="text-left py-3 pr-4 text-white/50 font-semibold text-xs uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="text-left py-3 text-white/50 font-semibold text-xs uppercase tracking-wider">
                      Propósito
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIES.map((c) => (
                    <tr
                      key={c.nombre}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-(--brand-teal)">
                        {c.nombre}
                      </td>
                      <td className="py-3 pr-4 text-white/60">{c.tipo}</td>
                      <td className="py-3 pr-4 text-white/60">{c.origen}</td>
                      <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                        {c.duracion}
                      </td>
                      <td className="py-3 text-white/50 text-xs">
                        {c.proposito}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              Cómo gestionar las cookies
            </h2>
            <p className="mb-4">
              Podés controlar y/o eliminar las cookies como quieras. Para más
              información, visitá{" "}
              <a
                href="https://aboutcookies.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--brand-teal) hover:underline"
              >
                aboutcookies.org
              </a>
              .
            </p>

            <div className="space-y-3">
              {[
                {
                  browser: "Chrome",
                  url: "https://support.google.com/chrome/answer/95647",
                },
                {
                  browser: "Firefox",
                  url: "https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer",
                },
                {
                  browser: "Safari",
                  url: "https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac",
                },
                {
                  browser: "Edge",
                  url: "https://support.microsoft.com/en-us/windows/delete-and-manage-cookies",
                },
              ].map(({ browser, url }) => (
                <div key={browser} className="flex items-center gap-3">
                  <span className="text-white/60 text-sm w-16">{browser}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--brand-teal) text-sm hover:underline truncate"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>

            <p className="mt-4 text-white/50 text-sm">
              Tené en cuenta que deshabilitar cookies puede afectar la
              funcionalidad del portal del programa (especialmente las cookies
              esenciales de sesión).
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              Cookies de terceros
            </h2>
            <p>
              Algunos terceros (Google, Meta, Stripe) pueden instalar sus
              propias cookies cuando usás nuestro sitio. Estas cookies están
              sujetas a las políticas de privacidad de cada empresa. No tenemos
              control sobre las cookies de terceros.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">
              Cambios a esta política
            </h2>
            <p>
              Podemos actualizar esta política en cualquier momento. La versión
              actualizada estará siempre disponible en esta página. Te
              recomendamos revisarla periódicamente.
            </p>
          </div>

          <div>
            <h2 className="text-white font-black text-xl mb-3">Contacto</h2>
            <p>
              Si tenés dudas sobre el uso de cookies:{" "}
              <a
                href="mailto:amdin@impacta.vc"
                className="text-(--brand-teal) hover:underline"
              >
                amdin@impacta.vc
              </a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
