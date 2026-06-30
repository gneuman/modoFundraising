export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getClaseById } from "@/lib/airtable";
import { updateCalendarEvent } from "@/lib/calendar";

// POST /api/airtable/clase-changed
//
// Webhook que Airtable Automations dispara cuando se UPDATEA un registro
// de la tabla `Clases MF26`. Mantiene el evento de Google Calendar sincronizado
// con el cambio en Airtable (titulo / descripcion / fecha).
//
// Setup en Airtable (UI):
//   1. Automations → Create automation
//   2. Trigger: "When record updated" en tabla Clases MF26.
//      Watched fields: titulo, descripcion, fecha
//   3. Action: "Run script" (o "Send webhook" si está disponible en tu plan).
//      Body JSON:
//        {
//          "secret": "<AIRTABLE_WEBHOOK_SECRET>",
//          "recordId": "{{record.id}}"
//        }
//      URL: https://portal.modofundraising.com/api/airtable/clase-changed
//
// Idempotente: si nada cambió respecto del Calendar, updateCalendarEvent es no-op.
//
// Seguridad: shared secret en env var `AIRTABLE_WEBHOOK_SECRET`. No usamos HMAC
// porque Airtable Automations no firman el body con el record id directo
// (eso requeriría el API de Webhooks nativo, más complejo de configurar).

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[airtable/clase-changed] AIRTABLE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { secret?: string; recordId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== expectedSecret) {
    console.warn("[airtable/clase-changed] secret incorrecto");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordId = body.recordId?.trim();
  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  const clase = await getClaseById(recordId);
  if (!clase) {
    console.warn(`[airtable/clase-changed] clase ${recordId} no existe en Airtable`);
    return NextResponse.json({ error: "Clase not found" }, { status: 404 });
  }

  const { titulo, descripcion, fecha, calendar_event_id, calendar_event_id_team } = clase;

  // Si la clase no tiene evento todavía, no hay nada que sincronizar.
  // El alta de evento de Calendar se hace al CREAR la clase desde /admin/clases,
  // no acá — no queremos crear eventos sueltos desde un webhook.
  if (!calendar_event_id && !calendar_event_id_team) {
    return NextResponse.json({
      ok: true,
      skipped: "sin calendar_event_id — la clase aún no tiene evento en Calendar",
    });
  }

  const updates: Promise<unknown>[] = [];
  if (calendar_event_id) {
    updates.push(
      updateCalendarEvent(calendar_event_id, { titulo, descripcion, fecha }).catch((e) => {
        console.error(`[airtable/clase-changed] founders event ${calendar_event_id} fail:`, e instanceof Error ? e.message : e);
        throw e;
      }),
    );
  }
  if (calendar_event_id_team) {
    updates.push(
      updateCalendarEvent(calendar_event_id_team, {
        titulo: titulo ? `[Equipo] ${titulo}` : undefined,
        descripcion,
        fecha,
      }).catch((e) => {
        console.error(`[airtable/clase-changed] team event ${calendar_event_id_team} fail:`, e instanceof Error ? e.message : e);
        throw e;
      }),
    );
  }

  const results = await Promise.allSettled(updates);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;

  // Refresca el cache de clases para que el portal vea el cambio sin esperar.
  revalidateTag("clases-content", { expire: 0 });

  return NextResponse.json({
    ok: failed === 0,
    recordId,
    titulo,
    fecha,
    eventsUpdated: ok,
    eventsFailed: failed,
  });
}
