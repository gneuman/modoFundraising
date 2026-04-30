import { getClasesWithContent } from "@/lib/airtable";
import { ClasesManager } from "@/components/admin/clases-manager";
import { CalendarSetup } from "@/components/admin/calendar-setup";

export const dynamic = "force-dynamic";

export default async function AdminClasesPage() {
  const clases = await getClasesWithContent();
  const hasCalendarId = !!process.env.GOOGLE_CALENDAR_ID;

  // Clases con fecha pero sin evento de Calendar agendado
  const clasesSinEvento = clases
    .filter((c) => c.fecha && !c.calendar_event_id)
    .map((c) => ({ id: c.id!, titulo: c.titulo, fecha: c.fecha }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Clases</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona clases, misiones y recursos del programa</p>
        </div>
        <CalendarSetup hasCalendarId={hasCalendarId} clasessinEvento={clasesSinEvento} />
      </div>
      <ClasesManager initialClases={clases} />
    </div>
  );
}
