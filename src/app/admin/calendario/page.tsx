import { CalendarioAdmin } from "@/components/admin/calendario-admin";

export const dynamic = "force-dynamic";

export default function CalendarioPage() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  return <CalendarioAdmin calendarId={calendarId} />;
}
