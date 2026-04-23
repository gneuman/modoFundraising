import { getClasesWithContent } from "@/lib/airtable";
import { ClasesManager } from "@/components/admin/clases-manager";

export const dynamic = "force-dynamic";

export default async function AdminClasesPage() {
  const clases = await getClasesWithContent();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Clases</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona clases, misiones y recursos del programa</p>
      </div>
      <ClasesManager initialClases={clases} />
    </div>
  );
}
