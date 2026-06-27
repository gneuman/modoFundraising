/**
 * Test del flujo de drip semanal a un email arbitrario.
 *
 * Manda:
 *   1. (opcional con --onboarding) Correo de onboarding actualizado
 *   2. Invitaciones SOLO a las clases del rango de semanas indicado, ordenadas por fecha
 *
 * Las semanas se calculan por el campo `semana` de Clases MF26 (1..N).
 *
 * Uso:
 *   npx tsx scripts/test-drip-semanal.ts <email> [nombre] --semanas <inicio>-<fin> [--onboarding]
 *
 * Ejemplos:
 *   # Test ronda 1: onboarding + clases semana 1 (S1 y S2)
 *   npx tsx scripts/test-drip-semanal.ts neumang@gmail.com Gabriel --semanas 1-1 --onboarding
 *
 *   # Test ronda 2: solo clases semanas 2 y 3 (sin reenviar onboarding)
 *   npx tsx scripts/test-drip-semanal.ts neumang@gmail.com Gabriel --semanas 2-3
 */

import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

// ── Args ──────────────────────────────────────────────────────────────────
const email = (process.argv[2] ?? "").trim().toLowerCase();
const nombre = (process.argv[3] && !process.argv[3].startsWith("--")) ? process.argv[3] : "founder";
const semanasArgIdx = process.argv.indexOf("--semanas");
const semanasArg = semanasArgIdx >= 0 ? process.argv[semanasArgIdx + 1] : "";
const SEND_ONBOARDING = process.argv.includes("--onboarding");

if (!email || !/.+@.+\..+/.test(email)) {
  console.error("Email inválido. Uso: npx tsx scripts/test-drip-semanal.ts <email> [nombre] --semanas <inicio>-<fin> [--onboarding]");
  process.exit(1);
}
if (!semanasArg || !/^\d+-\d+$/.test(semanasArg)) {
  console.error("Argumento --semanas inválido. Ejemplo: --semanas 1-1 o --semanas 2-3");
  process.exit(1);
}
const [semInicio, semFin] = semanasArg.split("-").map(Number);
if (semInicio > semFin) {
  console.error("semana inicio debe ser <= semana fin");
  process.exit(1);
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const FROM = process.env.GMAIL_FROM ?? "Modo Fundraising <admin@impacta.vc>";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

// ── Email ─────────────────────────────────────────────────────────────────

function encodeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  }
  return subject;
}

async function sendViaGmail(to: string, subject: string, html: string) {
  const gmail = google.gmail({ version: "v1", auth: getOAuth() });
  const message = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  const raw = Buffer.from(message).toString("base64url");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

function renderTemplate(str: string, ctx: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? "");
}

function wrapInBaseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Modo Fundraising 2026</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;" align="center">
          <img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="160" style="display:block;" />
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            Modo Fundraising 2026 · Impacta VC<br/>
            <a href="mailto:admin@impacta.vc" style="color:#a1a1aa;">admin@impacta.vc</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function mandarOnboarding(): Promise<void> {
  const reglas = await base("Automation Rules MF26")
    .select({ filterByFormula: `AND({trigger_event} = "onboarding", {active} = 1)` })
    .all();
  if (!reglas.length) throw new Error('No hay reglas activas para trigger "onboarding".');

  const regla = reglas[0];
  const templateLink = (regla.fields as Record<string, unknown>)["template_id"] as string[] | undefined;
  if (!templateLink?.length) throw new Error("La regla de onboarding no tiene template vinculado.");

  const tpl = await base("Email Templates MF26").find(templateLink[0]);
  const tf = tpl.fields as Record<string, unknown>;
  if (!tf.active) throw new Error("Template de onboarding inactivo.");

  const ctx: Record<string, string> = {
    nombre,
    email,
    portal_url: `${APP_URL}/portal`,
  };
  const subject = renderTemplate(tf.subject as string, ctx);
  const body = renderTemplate(tf.body_html as string, ctx);
  const html = wrapInBaseLayout(body);

  console.log(`📧 Mandando onboarding a ${email} → "${subject}"`);
  await sendViaGmail(email, subject, html);
  console.log("   ✓ Onboarding enviado\n");
}

// ── Calendar ──────────────────────────────────────────────────────────────

interface ClaseConFecha {
  id: string;
  titulo: string;
  fecha: string;
  semana: number;
  calendar_event_id: string;
}

async function getClasesDelRango(): Promise<ClaseConFecha[]> {
  const records = await base("Clases MF26")
    .select({
      fields: ["titulo", "fecha", "semana", "calendar_event_id"],
      filterByFormula: `AND({calendar_event_id} != "", {semana} >= ${semInicio}, {semana} <= ${semFin})`,
      sort: [{ field: "fecha", direction: "asc" }],
    })
    .all();

  return records
    .map((r) => {
      const f = r.fields as Record<string, unknown>;
      return {
        id: r.id,
        titulo: (f.titulo as string) ?? "(sin título)",
        fecha: (f.fecha as string) ?? "",
        semana: (f.semana as number) ?? 0,
        calendar_event_id: (f.calendar_event_id as string) ?? "",
      };
    })
    .filter((c) => c.calendar_event_id);
}

async function invitarAEvento(eventId: string, emailAttendee: string): Promise<"invitado" | "ya estaba"> {
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const attendees = res.data.attendees ?? [];
  if (attendees.some((a) => a.email?.toLowerCase() === emailAttendee.toLowerCase())) {
    return "ya estaba";
  }
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "all",
    requestBody: {
      attendees: [...attendees, { email: emailAttendee }],
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });
  return "invitado";
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(60));
  console.log(`TEST DRIP SEMANAL → ${email} (${nombre})`);
  console.log(`Semanas: ${semInicio}-${semFin} · Onboarding: ${SEND_ONBOARDING ? "sí" : "no"}`);
  console.log(`Calendar: ${CALENDAR_ID}`);
  console.log("─".repeat(60));
  console.log();

  if (SEND_ONBOARDING) {
    await mandarOnboarding();
  }

  console.log(`📅 Obteniendo clases con calendar_event_id, semanas ${semInicio}-${semFin}, ordenadas por fecha asc...`);
  const clases = await getClasesDelRango();
  console.log(`   ${clases.length} clases en el rango.\n`);

  if (!clases.length) {
    console.log("⚠️  No hay eventos para invitar en ese rango.");
    return;
  }

  console.log("📨 Invitando...\n");
  let invitadas = 0;
  let yaInvitadas = 0;
  let fallidas = 0;

  for (const [i, clase] of clases.entries()) {
    const prefix = `   [${String(i + 1).padStart(2, "0")}/${clases.length}] sem.${clase.semana} ${clase.fecha.slice(0, 10)} — ${clase.titulo}`;
    try {
      const r = await invitarAEvento(clase.calendar_event_id, email);
      if (r === "invitado") {
        console.log(`${prefix} → ✓ invitado`);
        invitadas++;
      } else {
        console.log(`${prefix} → ya estaba`);
        yaInvitadas++;
      }
    } catch (err) {
      console.log(`${prefix} → ✗ FALLÓ: ${err instanceof Error ? err.message : err}`);
      fallidas++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`RESUMEN: ${invitadas} nuevas, ${yaInvitadas} ya estaban, ${fallidas} fallidas.`);
  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err);
  process.exit(1);
});
