/**
 * Borra los 4 eventos TEST huérfanos que quedaron en Calendar tras la
 * duplicación de la primera prueba del webhook.
 *
 * Uso: npx tsx scripts/cleanup-test-orphans.ts --apply
 */
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

const ORPHAN_IDS = [
  "6smbm8jfmu1mfqhehsd1uhoc24",
  "ij5uepfc8g7s90gocm1mnbdj34",
  "b8q869ls7b2p1qnesaj7c687gk",
  "9k92ubjlic9l4bmdlpuuapk2po",
];

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  console.log(`CLEANUP huérfanos · ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  for (const id of ORPHAN_IDS) {
    if (!APPLY) {
      console.log(`  would delete: ${id}`);
      continue;
    }
    try {
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId: id,
        sendUpdates: "all",
      });
      console.log(`  ✅ deleted: ${id}`);
    } catch (e) {
      console.warn(`  ⚠️ fail ${id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!APPLY) console.log("\nDRY-RUN — pasá --apply para borrar");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
