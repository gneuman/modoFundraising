export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllApplications, markFormReminderSent } from "@/lib/airtable";
import { sendFormAbandonado } from "@/lib/email-engine";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Horas que deben pasar desde que se inició el draft antes de enviar el recordatorio.
const HOURS_UNTIL_REMINDER = 1;

function hoursSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

/**
 * Una postulación es "abandonada" si:
 *   - está en "Nueva postulación" (status que se asigna al crear el record)
 *   - no aceptó los términos legales (no sometió el form final)
 *   - tiene created_at, email y first_name (ya pasó las primeras pantallas)
 *   - aún no se le envió el recordatorio (form_reminder_sent_at vacío)
 */
function esAbandonada(a: { status?: string; accept_legal_terms?: boolean; created_at?: string; email?: string; first_name?: string; form_reminder_sent_at?: string }): boolean {
  return (
    a.status === "Nueva postulación" &&
    !a.accept_legal_terms &&
    !!a.created_at &&
    !!a.email &&
    !!a.first_name &&
    !a.form_reminder_sent_at
  );
}

/**
 * POST /api/cron/form-reminder
 * Llamar desde n8n cada 15-30 min con:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Envía un recordatorio a postulaciones iniciadas hace ≥1h que no se completaron,
 * y marca form_reminder_sent_at para no reenviar.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  const abandonadas = apps.filter(
    (a) => esAbandonada(a) && hoursSince(a.created_at!) >= HOURS_UNTIL_REMINDER
  );

  const results: { id: string; email: string; action: string }[] = [];
  const errors: { id: string; email: string; error: string }[] = [];

  for (const app of abandonadas) {
    try {
      await sendFormAbandonado(app.email!, app.first_name!, app.id!);
      await markFormReminderSent(app.id!);
      results.push({ id: app.id!, email: app.email!, action: "reminder_sent" });
    } catch (err) {
      errors.push({
        id: app.id!,
        email: app.email!,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ processed: abandonadas.length, actions: results, errors });
}

/**
 * GET /api/cron/form-reminder
 * Preview: muestra qué haría el cron si corriera ahora, sin enviar nada.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();
  const candidatas = apps.filter((a) => esAbandonada(a));

  const preview = candidatas.map((a) => {
    const horas = Math.round(hoursSince(a.created_at!) * 10) / 10;
    return {
      id: a.id,
      startup_name: a.startup_name,
      email: a.email,
      created_at: a.created_at,
      hours_since_start: horas,
      pending_action:
        horas >= HOURS_UNTIL_REMINDER
          ? "will_send_reminder"
          : `reminder_in_${(HOURS_UNTIL_REMINDER - horas).toFixed(1)}h`,
    };
  });

  return NextResponse.json({ count: candidatas.length, preview });
}
