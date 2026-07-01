export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getMisionByIdFresh,
  getAllFoundersWithAccess,
  markMisionNotifSent,
  markMisionAsActual,
} from "@/lib/airtable";
import { sendMisionActivadaEmail } from "@/lib/email-engine";

// POST /api/airtable/mision-activada
//
// Webhook que Airtable Automations dispara cuando una misión de la tabla
// `Misiones MF26` pasa a status = "Activa".
//
// Comportamiento:
//   - Gate: si status != "Activa", responde {skipped} sin enviar nada.
//   - Idempotencia: si `notif_enviada_at` ya tiene valor, responde {skipped}.
//     El fan-out del correo NO se re-manda aunque Airtable dispare 2 veces.
//   - Marca `notif_enviada_at = now()` ANTES de mandar los correos, sirve
//     como cross-process lock (mismo patrón que clase-upsert).
//   - Lock in-memory por recordId contra retries dentro del mismo proceso.
//   - Fan-out no bloqueante: si el correo a un founder falla, se loguea
//     pero seguimos con el resto.
//
// Modo prueba:
//   - Si el body trae `testEmail`, IGNORA la lista de founders y solo manda
//     el correo a ese email. Sirve para validar template sin spamear al
//     cohort. Tras validar, quitar `testEmail` del payload de la Automation.
//
// Seguridad: shared secret en env var AIRTABLE_WEBHOOK_SECRET
//   (misma que usa clase-upsert — un solo secreto para ambos webhooks).

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com"
).replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal/misiones`;

const inflightLocks = new Map<string, number>();
const LOCK_TTL_MS = 30_000;

function acquireLock(recordId: string): boolean {
  const now = Date.now();
  const existing = inflightLocks.get(recordId);
  if (existing && now - existing < LOCK_TTL_MS) return false;
  inflightLocks.set(recordId, now);
  return true;
}

function releaseLock(recordId: string) {
  inflightLocks.delete(recordId);
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[mision-activada] AIRTABLE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { secret?: string; recordId?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== expectedSecret) {
    console.warn("[mision-activada] secret incorrecto");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordId = body.recordId?.trim();
  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  if (!acquireLock(recordId)) {
    console.warn(`[mision-activada] lock activo para ${recordId} — request duplicado ignorado`);
    return NextResponse.json({
      ok: true,
      skipped: "otra ejecución del mismo recordId en progreso",
      recordId,
    });
  }

  try {
    return await handleActivada(recordId, body.testEmail);
  } finally {
    releaseLock(recordId);
  }
}

async function handleActivada(
  recordId: string,
  testEmailRaw?: string,
): Promise<NextResponse> {
  const mision = await getMisionByIdFresh(recordId);
  if (!mision) {
    return NextResponse.json({ error: "Misión not found" }, { status: 404 });
  }

  // Gate por status
  if (mision.status !== "Activa") {
    return NextResponse.json({
      ok: true,
      skipped: `status = "${mision.status}" (esperado "Activa")`,
      recordId,
    });
  }

  // Gate por idempotencia — ya se envió antes
  if (mision.notif_enviada_at) {
    return NextResponse.json({
      ok: true,
      skipped: `ya se notifico el ${mision.notif_enviada_at}`,
      recordId,
    });
  }

  if (!mision.titulo) {
    return NextResponse.json({
      ok: false,
      error: "Misión Activa pero sin titulo",
      recordId,
    }, { status: 400 });
  }

  // Marca ANTES de mandar (cross-process lock).
  // Si algo falla después, el timestamp queda y evita re-envíos accidentales.
  // Para forzar re-envío, vaciar `notif_enviada_at` manual en Airtable.
  await markMisionNotifSent(recordId).catch((e) => {
    console.error("[mision-activada] early mark fail:", e instanceof Error ? e.message : e);
  });

  // Resolver destinatarios
  const testEmail = testEmailRaw?.trim();
  const destinatarios = testEmail
    ? [{ id: "test", email: testEmail, first_name: "test" }]
    : (await getAllFoundersWithAccess()).map((f) => ({
        id: f.id,
        email: f.email,
        first_name: f.first_name,
      }));

  // Fan-out no bloqueante
  const results = await Promise.allSettled(
    destinatarios.map((f) =>
      sendMisionActivadaEmail(
        f.email,
        f.first_name || "founder",
        mision,
        PORTAL_URL,
      ),
    ),
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;
  const failures = results
    .map((r, i) => (r.status === "rejected" ? { email: destinatarios[i].email, error: String(r.reason) } : null))
    .filter(Boolean);

  // Auto-transición de status: Activa → Actual solo si el envío fue 100% exitoso.
  // Si hay fallos, la misión queda en "Activa" y el operador puede reintentar
  // vaciando notif_enviada_at (que hace que la Automation vuelva a disparar).
  // En modo test NO cambiamos el status para no alterar la misión real.
  let statusPatched = false;
  if (!testEmail && ok > 0 && failed === 0) {
    try {
      await markMisionAsActual(recordId);
      statusPatched = true;
    } catch (err) {
      console.error("[mision-activada] fallo al patchear status=Actual:", err instanceof Error ? err.message : err);
    }
  }

  // Revalidar el portal para que refleje el cambio de status.
  revalidateTag("clases-content", { expire: 0 });

  return NextResponse.json({
    ok: failed === 0,
    recordId,
    titulo: mision.titulo,
    testMode: testEmail ? `enabled (only ${testEmail})` : undefined,
    destinatarios: destinatarios.length,
    enviados: ok,
    fallidos: failed,
    failures: failures.length ? failures : undefined,
    statusPatched: statusPatched ? "Activa → Actual" : undefined,
  });
}
