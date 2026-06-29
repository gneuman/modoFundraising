import { getAllApplications, getAllCoupons, getAllPagos } from "@/lib/airtable";
import { PostulacionesClient } from "@/components/admin/postulaciones-client";

export const dynamic = "force-dynamic";

export default async function PostulacionesPage() {
  const [data, coupons, pagos] = await Promise.all([
    getAllApplications(),
    getAllCoupons(),
    getAllPagos(),
  ]);

  return <PostulacionesClient initialData={data} initialCoupons={coupons} initialPagos={pagos} />;
}
