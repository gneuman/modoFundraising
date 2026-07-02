export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  getAllApplications,
  updateApplicationStatus,
  markAdmissionEmailSent,
} from "@/lib/airtable";
import {
  sendAdmissionEmail,
  sendCouponLink,
  sendPaymentConfirmation,
} from "@/lib/email-engine";
import { buildCheckoutUrl } from "@/lib/checkout-url";

// POST /api/airtable/postulacion-admitida
//
// Webhook que Airtable Automations dispara cuando una postulación de la tabla
// `Postulaciones MF26` pasa a status = "Admitida" desde la UI de Airtable
// (o cualquier otro origen que salte el PATCH del admin).
//
// Comportamiento:
//   - Gate: si status != "Admitida", responde {skipped} sin enviar nada.
//   - Idempotencia: si `admission_email_sent_at` ya tiene valor, responde
//     {skipped}. El correo NO se re-manda aunque Airtable dispare 2 veces.
//   - Marca `admission_email_sent_at = now()` DESPUÉS de mandar (única diferencia
//     con mision-activada: aquí el correo es 1-a-1, no fan-out, así que si falla
//     preferimos re-intento vía Airtable → no marcamos preventivamente).
//   - Beca 100%: reproduce el flujo del admin PATCH (inscribe directo, manda
//     correo de pago, invita Calendar). NO reset de flags de followup aquí
//     porque el admin PATCH ya lo hace cuando el status cambia desde el UI.
//     El webhook solo cubre el caso en que Airtable UI edita el status directo.
//   - Lock in-memory por recordId contra retries del mismo proceso.
//
// Modo prueba:
//   - Si el body trae `testEmail`, envía el correo a ese email en vez del
//     founder real. NO marca admission_email_sent_at para no bloquear el
//     envío real después.
//
// Seguridad: shared secret en env var AIRTABLE_WEBHOOK_SECRET.

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
    console.error("[postulacion-admitida] AIRTABLE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { secret?: string; recordId?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== expectedSecret) {
    console.warn("[postulacion-admitida] secret incorrecto");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordId = body.recordId?.trim();
  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  if (!acquireLock(recordId)) {
    console.warn(`[postulacion-admitida] lock activo para ${recordId} — request duplicado ignorado`);
    return NextResponse.json({
      ok: true,
      skipped: "otra ejecución del mismo recordId en progreso",
      recordId,
    });
  }

  try {
    return await handleAdmitida(recordId, body.testEmail);
  } finally {
    releaseLock(recordId);
  }
}

async function handleAdmitida(
  recordId: string,
  testEmailRaw?: string,
): Promise<NextResponse> {
  const apps = await getAllApplications();
  const app = apps.find((a) => a.id === recordId);
  if (!app) {
    return NextResponse.json({ error: "Postulación not found" }, { status: 404 });
  }

  // Gate por status
  if (app.status !== "Admitida") {
    return NextResponse.json({
      ok: true,
      skipped: `status = "${app.status}" (esperado "Admitida")`,
      recordId,
    });
  }

  const testEmail = testEmailRaw?.trim();

  // Gate por idempotencia — ya se envió antes (skip en modo real, en test siempre corre)
  if (!testEmail && app.admission_email_sent_at) {
    return NextResponse.json({
      ok: true,
      skipped: `ya se envió el ${app.admission_email_sent_at}`,
      recordId,
    });
  }

  if (!app.email || !app.first_name) {
    return NextResponse.json({
      ok: false,
      error: "Postulación sin email o first_name (¿founder no vinculado?)",
      recordId,
    }, { status: 400 });
  }

  const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;
  const toEmail = testEmail ?? app.email;
  const toName = app.first_name;

  console.log(`[postulacion-admitida] recordId=${recordId} email=${toEmail} discount=${discountPct}% test=${testEmail ? "sí" : "no"}`);

  // Beca 100%: no hay cobro. Inscribe directo, manda correo de pago (no admisión).
  // Reproducimos el flujo del admin PATCH (route.ts:211-223).
  if (discountPct === 100 && !testEmail) {
    await updateApplicationStatus(recordId, "Inscrita", {
      portal_access: true,
      payment_status: "Beca 100%",
    });
    await sendPaymentConfirmation(app.email, app.first_name, 1);
    await markAdmissionEmailSent(recordId).catch((e) =>
      console.error(`[postulacion-admitida] mark fail recordId=${recordId}:`, e instanceof Error ? e.message : e)
    );
    return NextResponse.json({
      ok: true,
      recordId,
      email: app.email,
      inscrita_directa: true,
      reason: "beca_100",
    });
  }

  const checkoutUrl = await buildCheckoutUrl(recordId, app);
  console.log(`[postulacion-admitida] checkoutUrl=${checkoutUrl}`);

  try {
    if (discountPct > 0) {
      await sendCouponLink(toEmail, toName, checkoutUrl, discountPct);
    } else {
      await sendAdmissionEmail(toEmail, toName, checkoutUrl);
    }
  } catch (err) {
    console.error(`[postulacion-admitida] send fail recordId=${recordId}:`, err instanceof Error ? err.message : err);
    return NextResponse.json({
      ok: false,
      recordId,
      email: toEmail,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }

  // Marca idempotencia solo en modo real (test no marca para no bloquear el envío real).
  if (!testEmail) {
    await markAdmissionEmailSent(recordId).catch((e) =>
      console.error(`[postulacion-admitida] mark fail recordId=${recordId}:`, e instanceof Error ? e.message : e)
    );
  }

  return NextResponse.json({
    ok: true,
    recordId,
    email: toEmail,
    checkoutUrl,
    discountPct,
    testMode: testEmail ? `enabled (only ${testEmail})` : undefined,
  });
}
