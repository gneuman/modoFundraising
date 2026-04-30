import Link from "next/link";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, getAllApplications } from "@/lib/airtable";
import { createCheckoutToken } from "@/lib/checkout-token";
import { CheckoutOptions } from "@/components/checkout/checkout-options";
import { ChurnForm } from "./churn-form";
import { Lock, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SinAccesoPage() {
  const session = await obtenerSesion();
  const profile = session?.email ? await getFounderProfile(session.email) : null;
  const status = profile?.status;

  if (status === "Admitida" || status === "Inscrita") {
    // Generate checkout token to show direct payment buttons
    const apps = await getAllApplications();
    const app = apps.find((a) => a.email === session?.email && a.status === "Admitida");
    let checkoutToken: string | null = null;
    if (app?.id) {
      checkoutToken = await createCheckoutToken({
        airtableId: app.id,
        email: app.email!,
        firstName: app.first_name!,
        startupName: app.startup_name!,
        stripeCouponId: app.stripe_coupon_id as string | undefined,
        discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
      });
    }

    const hasDiscount = app?.discount_percent && Number(app.discount_percent) > 0;
    const discountPct = hasDiscount ? Number(app!.discount_percent) : 0;
    const precioMensual = Math.round(349 * (1 - discountPct / 100));
    const precioUnico = Math.round(349 * 3 * (1 - discountPct / 100));

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-lg w-full space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">¡Felicitaciones, {profile.first_name}!</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Tu startup <strong className="text-zinc-800">{profile.startup_name}</strong> fue admitida a Modo Fundraising 2026.
              Completá el pago para activar tu acceso al portal.
            </p>
          </div>

          {/* Discount badge */}
          {hasDiscount && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center text-sm text-purple-700 font-semibold">
              🎉 Tenés un descuento del {discountPct}% aplicado
            </div>
          )}

          {/* Payment options */}
          {checkoutToken ? (
            <CheckoutOptions
              token={checkoutToken}
              monthlyPrice={precioMensual}
              fullPrice={precioUnico}
              fullSaving={349 * 3 - precioUnico}
              hasDiscount={hasDiscount}
            />
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-center">
              <p className="font-semibold mb-1">Link de pago en camino</p>
              <p>Revisá tu email o escribinos a <a href="mailto:hello@impacta.vc" className="underline font-medium">hello@impacta.vc</a></p>
            </div>
          )}

          <p className="text-center text-xs text-zinc-400">
            Pagos procesados de forma segura por Stripe.{" "}
            <a href="mailto:hello@impacta.vc" className="underline">¿Preguntas? hello@impacta.vc</a>
          </p>
        </div>
      </div>
    );
  }

  if (status === "Churn By Founder") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-zinc-400" />
            </div>
            <h1 className="text-xl font-bold text-zinc-800">Cancelaste tu suscripción</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Tu acceso a Modo Fundraising 2026 fue desactivado. Lamentamos que hayas decidido salir del programa.
            </p>
          </div>

          <ChurnForm />

          <p className="text-center text-xs text-zinc-400">
            ¿Fue un error?{" "}
            <a href="mailto:hello@impacta.vc" className="underline">hello@impacta.vc</a>
          </p>
        </div>
      </div>
    );
  }

  if (status === "Churn") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <XCircle className="h-7 w-7 text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-800">Suscripción cancelada</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Tu suscripción a Modo Fundraising fue cancelada y ya no tenés acceso al portal.
              Si creés que es un error, escribinos.
            </p>
          </div>
          <a href="mailto:hello@impacta.vc" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 underline">
            hello@impacta.vc
          </a>
        </div>
      </div>
    );
  }

  if (status === "Rechazada" || status === "Rechazada por founder" || status === "Sin Respuesta") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <XCircle className="h-7 w-7 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-800">Tu postulación no avanzó</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              En esta edición no pudimos continuar con tu candidatura. Te animamos a seguir construyendo y a postular en la próxima edición.
            </p>
          </div>
          <a href="mailto:hello@impacta.vc" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 underline">
            ¿Preguntas? hello@impacta.vc
          </a>
        </div>
      </div>
    );
  }

  if (profile) {
    // Has an account but not admitted yet (Nueva postulación / En revisión)
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-800">Postulación en revisión</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Hola <strong>{profile.first_name}</strong>, recibimos tu postulación de <strong>{profile.startup_name}</strong>. Nuestro equipo la está evaluando y te notificaremos por email en los próximos días.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
            Estado actual: <strong>{status ?? "En revisión"}</strong>
          </div>
        </div>
      </div>
    );
  }

  // No account found
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7 text-zinc-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-zinc-800">Esta sección requiere acceso</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            El contenido del portal es exclusivo para participantes de <strong>Modo Fundraising 2026</strong>.
          </p>
        </div>
        <Link href="/apply"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          Postular al programa <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-zinc-400">
          ¿Ya postulaste?{" "}
          <a href="mailto:hello@impacta.vc" className="underline">hello@impacta.vc</a>
        </p>
      </div>
    </div>
  );
}
