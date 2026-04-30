import { getClasesWithContent } from "@/lib/airtable";
import { ClasesManager } from "@/components/admin/clases-manager";
import { CalendarSetup } from "@/components/admin/calendar-setup";

export const dynamic = "force-dynamic";

export default async function AdminClasesPage() {
  const clases = await getClasesWithContent();
  const hasCalendarId = !!process.env.GOOGLE_CALENDAR_ID;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Clases</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona clases, misiones y recursos del programa</p>
        </div>
        <CalendarSetup hasCalendarId={hasCalendarId} />
      </div>
      <ClasesManager initialClases={clases} />
    </div>
  );
}
