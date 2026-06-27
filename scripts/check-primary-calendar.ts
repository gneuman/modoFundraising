/**
 * Verifica que el refresh token apunta a admin@impacta.vc
 * y que `primary` resuelve a su calendario principal.
 *
 * Uso: npx tsx scripts/check-primary-calendar.ts
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  const auth = getOAuth();

  // Detalles del calendar "primary"
  const calendar = google.calendar({ version: "v3", auth });
  const primary = await calendar.calendars.get({ calendarId: "primary" });
  console.log("primary →", { id: primary.data.id, summary: primary.data.summary, timeZone: primary.data.timeZone });

  // Lista de calendarios accesibles (solo summary + id + accessRole)
  const list = await calendar.calendarList.list();
  console.log("\nCalendars accesibles:");
  for (const c of list.data.items ?? []) {
    console.log(`  - ${c.summary} (${c.id}) [${c.accessRole}]${c.primary ? "  ← primary" : ""}`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
