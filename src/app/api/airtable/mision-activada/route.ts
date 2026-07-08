export const dynamic = "force-dynamic";
// El fan-out manda los correos en serie con pausa (~1/seg), así que con un
// cohort grande (~99 founders) el request tarda ~2 min. El default de Vercel
// (10-15s) lo mataría a la mitad. 300s da margen de sobra. Mismo patrón que
// el cron sync-attendees, que también envía en serie con delay.
export const maxDuration = 300;
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
// Seguridad: Authorization: Bearer <CRON_SECRET> (mismo patrón que los demás
//   crons: session-notify, cobranza, form-reminder). n8n lo dispara como cron.

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com"
).replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal/misiones`;
const SLACK_CHANNEL = process.env.SLACK_CANAL_COHORT ?? "#modo-fundraising";

// Arma el texto de Slack para el aviso de misión. NO se postea aquí — se
// devuelve en el JSON para que n8n lo rutee a su nodo Slack (no hay bot en
// el repo). Ver WI-1822 / WI-1635.
function buildSlackText(mision: { titulo?: string; descripcion?: string }): string {
  const desc = (mision.descripcion ?? "").trim();
  return [
    `🎯 *Nueva misión activada:* ${mision.titulo ?? ""}`,
    desc ? `${desc.slice(0, 240)}${desc.length > 240 ? "…" : ""}` : "",
    `🔗 <${PORTAL_URL}|Ver misión en el portal>`,
  ].filter(Boolean).join("\n");
}

// Ritmo del fan-out de correos, anclado a los límites reales de Gmail API:
//   - Rate por usuario: 6,000 quota units / minuto / usuario.
//   - messages.send cuesta 100 units → techo = 60 correos/min = 1 correo/seg.
//   - Concurrencia alta también revienta: mandar los 99 en paralelo
//     (Promise.allSettled sobre todo el map) tiraba
//     "Too many concurrent requests for user" y fallaban ~19 de 99.
// Por eso enviamos UNO A LA VEZ (serial) con pausa entre cada correo.
// 1200ms deja margen bajo el techo de 1/seg y evita rozar el rate limit.
// Con ~99 founders: ~120s de envío → por eso maxDuration=300 arriba.
const MISION_SEND_INTERVAL_MS = 1_200;

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

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
  // Auth unificada con los demás crons: Authorization: Bearer <CRON_SECRET>.
  // (Antes usaba `secret` en el body con AIRTABLE_WEBHOOK_SECRET, del tiempo en
  // que lo disparaba una Airtable Automation. Ahora lo dispara n8n como cron,
  // así que usa el mismo patrón que session-notify / cobranza / form-reminder.)
  const CRON_SECRET = process.env.CRON_SECRET ?? "";
  if (!CRON_SECRET) {
    console.error("[mision-activada] CRON_SECRET no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${CRON_SECRET}`) {
    console.warn("[mision-activada] Bearer incorrecto");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { recordId?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  const testEmail = testEmailRaw?.trim();

  // Gate por idempotencia — ya se envió antes.
  // En modo test NO aplica: probar el template no debe quedar bloqueado por
  // un envío previo. Solo el envío real respeta la idempotencia.
  if (!testEmail && mision.notif_enviada_at) {
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
  // En modo test NO se marca: así se puede re-probar el correo sin resetear
  // el campo cada vez ni bloquear el envío real posterior.
  if (!testEmail) {
    await markMisionNotifSent(recordId).catch((e) => {
      console.error("[mision-activada] early mark fail:", e instanceof Error ? e.message : e);
    });
  }

  // Resolver destinatarios
  const destinatarios = testEmail
    ? [{ id: "test", email: testEmail, first_name: "test" }]
    : (await getAllFoundersWithAccess()).map((f) => ({
        id: f.id,
        email: f.email,
        first_name: f.first_name,
      }));

  // Fan-out SERIAL: un correo a la vez con pausa entre cada uno (~1/seg).
  // NO en paralelo: Gmail rechaza demasiados envíos concurrentes del mismo
  // usuario ("Too many concurrent requests for user") y además tiene un rate
  // de 60 correos/min por usuario. El loop con pausa respeta ambos límites.
  // Guardamos el resultado por índice para poder mapear failures por email.
  const results: PromiseSettledResult<unknown>[] = [];
  for (let i = 0; i < destinatarios.length; i++) {
    const f = destinatarios[i];
    try {
      await sendMisionActivadaEmail(
        f.email,
        f.first_name || "founder",
        mision,
        PORTAL_URL,
      );
      results.push({ status: "fulfilled", value: undefined });
    } catch (reason) {
      results.push({ status: "rejected", reason });
    }
    // Pausa entre correos (no después del último) para respetar el rate de Gmail.
    if (i < destinatarios.length - 1) {
      await sleep(MISION_SEND_INTERVAL_MS);
    }
  }

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
    // n8n rutea esto a su nodo Slack (el código NO postea a Slack — no hay bot).
    // Se devuelve también en modo test para poder revisar el copy.
    slack: { canal: SLACK_CHANNEL, texto: buildSlackText(mision) },
  });
}
