import { getAllApplications, getAllCoupons } from "@/lib/airtable";
import { PostulacionesClient } from "@/components/admin/postulaciones-client";

export const dynamic = "force-dynamic";

export default async function PostulacionesPage() {
  const [data, coupons] = await Promise.all([
    getAllApplications(),
    getAllCoupons(),
  ]);

  return <PostulacionesClient initialData={data} initialCoupons={coupons} />;
}
