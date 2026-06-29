import { getEmailTemplates, getAutomationRules } from "@/lib/airtable";
import { ComunicacionesManager } from "@/components/admin/comunicaciones-manager";

export const dynamic = "force-dynamic";

export default async function ComunicacionesPage() {
  const [templates, rules] = await Promise.all([
    getEmailTemplates(),
    getAutomationRules(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Comunicaciones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Edita los templates de email y configura qué se envía ante cada evento
        </p>
      </div>
      <ComunicacionesManager initialTemplates={templates} initialRules={rules} />
    </div>
  );
}
