import Link from "next/link";
import { obtenerSesionDeHeaders as obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { Lock, ArrowRight, Clock, CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SinAccesoPage() {
  const session = await obtenerSesion();
  const profile = session?.email ? await getFounderProfile(session.email) : null;
  const status = profile?.status;

  if (status === "Admitida") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
            <Clock className="h-7 w-7 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-800">Completá tu inscripción</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Hola <strong>{profile.first_name}</strong>, tu startup <strong>{profile.startup_name}</strong> fue admitida. Revisá tu email — te enviamos un link de pago para activar tu acceso al portal.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">¿No recibiste el email?</p>
            <p>Escribinos a <a href="mailto:hello@impacta.vc" className="underline font-medium">hello@impacta.vc</a> y te lo reenviamos.</p>
          </div>
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
