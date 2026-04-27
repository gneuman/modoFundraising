import { verifyCheckoutToken } from "@/lib/checkout-token";
import { notFound } from "next/navigation";
import { CheckoutOptions } from "@/components/checkout/checkout-options";
import Image from "next/image";

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await verifyCheckoutToken(token);
  if (!payload) notFound();

  const { firstName, startupName, discountPercent } = payload;
  const BASE = 349;
  const TOTAL = BASE * 3; // $1,047
  const discount = discountPercent ?? 0;
  const monthlyPrice = Math.round(BASE * (1 - discount / 100) * 100) / 100;
  const fullPrice = Math.round(TOTAL * (1 - discount / 100) * 100) / 100;
  const fullSaving = TOTAL - fullPrice;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 px-6 py-4">
        <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={140} height={48} className="object-contain" />
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Welcome */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-zinc-800">
              ¡Felicitaciones, {firstName}! 🎉
            </h1>
            <p className="text-zinc-500">
              <span className="font-semibold text-zinc-700">{startupName}</span> fue admitida a Modo Fundraising 2026.
              <br />Elige cómo quieres pagar para activar tu acceso.
            </p>
            {discount > 0 && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full">
                🎁 Tienes un descuento del {discount}% aplicado
              </div>
            )}
          </div>

          {/* What's included */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
            <h3 className="font-semibold text-zinc-700 text-sm uppercase tracking-wide">Incluye</h3>
            <ul className="space-y-2 text-sm text-zinc-600">
              {[
                "12 semanas de clases en vivo con mentores top de LATAM",
                "Acceso a red de 200+ inversores activos",
                "Misiones semanales con feedback personalizado",
                "Portal exclusivo para founders y equipo",
                "Comunidad privada de founders en programa",
                "Sesiones 1:1 de seguimiento con el equipo ImpactaVC",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment options (client component) */}
          <CheckoutOptions
            token={token}
            monthlyPrice={monthlyPrice}
            fullPrice={fullPrice}
            fullSaving={fullSaving}
            hasDiscount={discount > 0}
          />

          <p className="text-center text-xs text-zinc-400">
            Pagos procesados de forma segura por Stripe · SSL · Puedes cancelar en cualquier momento
          </p>
        </div>
      </main>
    </div>
  );
}
