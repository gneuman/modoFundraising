import { getAllCoupons } from "@/lib/airtable";
import { CuponesManager } from "@/components/admin/cupones-manager";

export const dynamic = "force-dynamic";

export default async function CuponesPage() {
  const coupons = await getAllCoupons();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Cupones y Descuentos</h1>
        <p className="text-sm text-zinc-500 mt-1">Crea cupones de descuento y envía links personalizados de pago</p>
      </div>
      <CuponesManager initialCoupons={coupons} />
    </div>
  );
}
