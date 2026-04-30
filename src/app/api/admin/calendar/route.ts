import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { createProgramCalendar } from "@/lib/calendar";

// POST /api/admin/calendar
// Crea el calendario "Modo Fundraising 2026" y devuelve el ID para guardar en GOOGLE_CALENDAR_ID
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const { name } = await req.json().catch(() => ({}));

  try {
    const calendarId = await createProgramCalendar(name ?? "Modo Fundraising 2026");
    return NextResponse.json({
      calendarId,
      instruction: `Agrega GOOGLE_CALENDAR_ID=${calendarId} en tus variables de entorno (Vercel) y redespliega.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
