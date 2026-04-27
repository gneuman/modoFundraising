import Image from "next/image";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-100 px-6 py-4">
        <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={140} height={48} className="object-contain" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-zinc-800">¡Pago recibido!</h1>
          <p className="text-zinc-500">
            Tu acceso al portal de Modo Fundraising 2026 será activado en los próximos minutos.
            Recibirás un email con tus credenciales de acceso.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left space-y-1">
            <p className="font-semibold">Próximos pasos:</p>
            <p>1. Revisa tu email — recibirás el link de acceso al portal</p>
            <p>2. Invita a tu equipo desde el portal</p>
            <p>3. Completa tu perfil de startup</p>
          </div>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Ir al portal →
          </Link>

          <p className="text-xs text-zinc-400">
            ¿Problemas? Escríbenos a{" "}
            <a href="mailto:hello@impacta.vc" className="underline">hello@impacta.vc</a>
          </p>
        </div>
      </main>
    </div>
  );
}
