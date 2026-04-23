import { getAllMisiones, getClasesWithContent } from "@/lib/airtable";
import { MisionesManager } from "@/components/admin/misiones-manager";

export const dynamic = "force-dynamic";

export default async function AdminMisionesPage() {
  const [misiones, clases] = await Promise.all([
    getAllMisiones(),
    getClasesWithContent(),
  ]);
  return <MisionesManager initialMisiones={misiones} clases={clases} />;
}
