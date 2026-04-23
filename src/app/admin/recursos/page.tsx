import { getAllRecursos, getClasesWithContent } from "@/lib/airtable";
import { RecursosManager } from "@/components/admin/recursos-manager";

export const dynamic = "force-dynamic";

export default async function AdminRecursosPage() {
  const [recursos, clases] = await Promise.all([
    getAllRecursos(),
    getClasesWithContent(),
  ]);
  return <RecursosManager initialRecursos={recursos} clases={clases} />;
}
