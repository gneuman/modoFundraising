import Link from "next/link";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications } from "@/lib/airtable";
import { Lock, ArrowRight, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SinAccesoPage() {
  const session = await obtenerSesion();
  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session?.email);

  // Already applied but pending payment
  const yaAplico = !!app;
  const estaAdmitida = app?.status === "Admitida";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7 text-zinc-400" />
        </div>

        {estaAdmitida ? (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-800">Acceso pendiente de pago</h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Tu aplicación fue admitida. Revisa tu email — te enviamos un link de pago para activar tu acceso al portal.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
              <p className="font-semibold mb-1">¿No recibiste el email?</p>
              <p>Escríbenos a <a href="mailto:hello@impacta.vc" className="underline font-medium">hello@impacta.vc</a> con tu email y te lo reenviamos.</p>
            </div>
          </>
        ) : yaAplico ? (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-800">Tu aplicación está en revisión</h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Recibimos tu aplicación y la estamos evaluando. Te notificaremos por email con el resultado en los próximos días.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
              <p>¿Tienes preguntas? Escríbenos a{" "}
                <a href="mailto:hello@impacta.vc" className="underline font-medium">hello@impacta.vc</a>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-800">Esta sección requiere acceso</h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                El contenido del portal es exclusivo para participantes de <strong>Modo Fundraising 2026</strong>.
                Aplica para unirte al programa.
              </p>
            </div>
            <Link href="/apply"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Aplicar al programa <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-zinc-400">
              ¿Ya aplicaste?{" "}
              <a href="mailto:hello@impacta.vc" className="underline">hello@impacta.vc</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
