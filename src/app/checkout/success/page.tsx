export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { SuccessRedirect } from "./success-redirect";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  const portalUrl = session_id
    ? `/api/auth/checkout-login?session_id=${session_id}`
    : "/portal";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-100 px-6 py-4">
        <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={140} height={48} className="object-contain" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-zinc-800">¡Pago recibido!</h1>
          <p className="text-zinc-500 leading-relaxed">
            Tu startup fue admitida a <strong className="text-zinc-700">Modo Fundraising 2026</strong>.
            Tu acceso al portal se está activando.
          </p>

          <Link
            href={portalUrl}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Ir al portal →
          </Link>

          <SuccessRedirect redirectUrl={portalUrl} />
        </div>
      </main>
    </div>
  );
}
