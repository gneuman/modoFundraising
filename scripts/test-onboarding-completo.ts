/**
 * Test: Onboarding completo a un email arbitrario.
 *
 * Manda el correo de onboarding y lo invita a TODOS los eventos de Calendar
 * (founders, no team) ordenados por fecha asc. Sin tocar Airtable / portal_access.
 *
 * Uso:
 *   npx tsx scripts/test-onboarding-completo.ts <email> [nombre]
 *
 * Ejemplo:
 *   npx tsx scripts/test-onboarding-completo.ts neumang@gmail.com Gabriel
 */

import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const email = (process.argv[2] ?? "").trim().toLowerCase();
const nombre = process.argv[3] ?? "founder";

if (!email || !/.+@.+\..+/.test(email)) {
  console.error("Email inválido. Uso: npx tsx scripts/test-onboarding-completo.ts <email> [nombre]");
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

interface ClaseConFecha {
  id: string;
  titulo: string;
  fecha: string;
  calendar_event_id: string;
}

async function getClasesOrdenadasPorFecha(): Promise<ClaseConFecha[]> {
  const records = await base("Clases MF26")
    .select({
      fields: ["titulo", "fecha", "calendar_event_id"],
      filterByFormula: `{calendar_event_id} != ""`,
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
        calendar_event_id: (f.calendar_event_id as string) ?? "",
      };
    })
    .filter((c) => c.calendar_event_id);
}

async function invitarAEvento(eventId: string, emailAttendee: string): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const event = res.data;
  const attendees = event.attendees ?? [];

  if (attendees.some((a) => a.email?.toLowerCase() === emailAttendee.toLowerCase())) {
    return; // ya estaba
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
}

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
  // Lee la primera regla activa del trigger "onboarding"
  const reglas = await base("Automation Rules MF26")
    .select({
      filterByFormula: `AND({trigger_event} = "onboarding", {active} = 1)`,
    })
    .all();

  if (!reglas.length) {
    throw new Error('No hay reglas activas para trigger "onboarding" en Automation Rules MF26.');
  }

  const regla = reglas[0];
  const templateLink = (regla.fields as Record<string, unknown>)["template_id"] as string[] | undefined;
  if (!templateLink?.length) throw new Error("La regla de onboarding no tiene template vinculado.");

  const templateRecord = await base("Email Templates MF26").find(templateLink[0]);
  const tf = templateRecord.fields as Record<string, unknown>;
  const subject = tf.subject as string;
  const bodyHtml = tf.body_html as string;
  const active = tf.active as boolean | undefined;

  if (!active) throw new Error("El template de onboarding está inactivo.");

  const ctx: Record<string, string> = {
    nombre,
    email,
    portal_url: `${APP_URL}/portal`,
  };

  const renderedSubject = renderTemplate(subject, ctx);
  const renderedBody = renderTemplate(bodyHtml, ctx);
  const html = wrapInBaseLayout(renderedBody);

  console.log(`\n📧 Mandando onboarding a ${email} con subject: "${renderedSubject}"`);
  await sendViaGmail(email, renderedSubject, html);
  console.log("   ✓ Onboarding enviado");
}

async function main() {
  console.log("─".repeat(60));
  console.log(`TEST ONBOARDING COMPLETO → ${email} (${nombre})`);
  console.log("─".repeat(60));

  // 1. Onboarding email primero (pre-warmea Gmail con admin@impacta.vc)
  await mandarOnboarding();

  // 2. Invitaciones a todos los eventos ordenadas por fecha
  console.log("\n📅 Obteniendo clases con calendar_event_id (ordenadas por fecha asc)...");
  const clases = await getClasesOrdenadasPorFecha();
  console.log(`   ${clases.length} clases con evento de Calendar.`);

  if (!clases.length) {
    console.log("\n⚠️  No hay eventos para invitar. Termino aquí.");
    return;
  }

  console.log("\n📨 Invitando uno por uno (orden cronológico)...\n");

  let invitadas = 0;
  let yaInvitadas = 0;
  let fallidas = 0;

  for (const [i, clase] of clases.entries()) {
    const prefix = `   [${String(i + 1).padStart(2, "0")}/${clases.length}] ${clase.fecha} — ${clase.titulo}`;
    try {
      // Check si ya estaba
      const calendar = google.calendar({ version: "v3", auth: getOAuth() });
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: clase.calendar_event_id });
      const yaEsta = (res.data.attendees ?? []).some(
        (a) => a.email?.toLowerCase() === email.toLowerCase(),
      );

      if (yaEsta) {
        console.log(`${prefix} → ya estaba invitado`);
        yaInvitadas++;
      } else {
        await invitarAEvento(clase.calendar_event_id, email);
        console.log(`${prefix} → ✓ invitado`);
        invitadas++;
      }
    } catch (err) {
      console.log(`${prefix} → ✗ FALLÓ: ${err instanceof Error ? err.message : err}`);
      fallidas++;
    }
  }

  console.log("\n─".repeat(60));
  console.log(`RESUMEN: ${invitadas} invitaciones nuevas, ${yaInvitadas} ya estaban, ${fallidas} fallidas.`);
  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err);
  process.exit(1);
});
