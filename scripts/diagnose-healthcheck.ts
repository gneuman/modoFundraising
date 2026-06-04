/**
 * Diagnóstico del Health Check: lista todas las startups que aparecen en
 * /admin/dashboard (filtro: status = "Inscrita" | "Invitada institucional")
 * con todos los campos relevantes, para detectar inconsistencias.
 *
 * Uso:
 *   npx tsx scripts/diagnose-healthcheck.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { getAllApplications, Tables } from "../src/lib/airtable";

function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}

async function main() {
  const apps = await getAllApplications();
  const founders = await base(Tables.FOUNDERS).select().all();
  const founderById = new Map(founders.map((f) => [f.id, f.fields as Record<string, unknown>]));

  console.log(`\nTotal postulaciones: ${apps.length}\n`);

  // Conteo por status
  const byStatus: Record<string, number> = {};
  for (const a of apps) {
    const s = a.status ?? "(sin status)";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  console.log("Distribución por status:");
  for (const [s, n] of Object.entries(byStatus).sort()) {
    console.log(`  ${s.padEnd(28)}: ${n}`);
  }
  console.log();

  // Mismo filtro que /admin/dashboard
  const inscritasList = apps.filter(
    (a) => a.status === "Inscrita" || a.status === "Invitada institucional"
  );
  console.log(`En Health Check (status Inscrita | Invitada institucional): ${inscritasList.length}\n`);

  console.log("─".repeat(150));
  console.log(
    [
      "startup_name".padEnd(28),
      "status".padEnd(22),
      "payment_status".padEnd(18),
      "post.portal".padEnd(12),
      "founder.portal".padEnd(15),
      "discount%".padEnd(9),
      "stripe_sub".padEnd(20),
    ].join(" | ")
  );
  console.log("─".repeat(150));

  for (const a of inscritasList) {
    const founderIds = (a.founder_record as string[] | undefined) ?? [];
    const founderPortals = founderIds.map((id) => {
      const f = founderById.get(id);
      return f?.portal_access === true;
    });
    const founderPortalStr = founderPortals.length
      ? founderPortals.map((b) => (b ? "T" : "F")).join("")
      : "—";

    console.log(
      [
        (a.startup_name ?? "—").padEnd(28),
        (a.status ?? "—").padEnd(22),
        (a.payment_status ?? "—").padEnd(18),
        String(a.portal_access ?? false).padEnd(12),
        founderPortalStr.padEnd(15),
        String(a.discount_percent ?? "—").padEnd(9),
        (a.stripe_subscription_id ?? "—").toString().slice(0, 18).padEnd(20),
      ].join(" | ")
    );
  }

  console.log("─".repeat(150));

  // Todas las Admitidas: por si Gabriel ve estos como "inscritas"
  const admitidas = apps.filter((a) => a.status === "Admitida");
  console.log(`\n────  Admitidas (${admitidas.length})  ────`);
  for (const a of admitidas) {
    const founderIds = (a.founder_record as string[] | undefined) ?? [];
    const founderPortals = founderIds.map((id) => {
      const f = founderById.get(id);
      return f?.portal_access === true;
    });
    const founderPortalStr = founderPortals.length
      ? founderPortals.map((b) => (b ? "T" : "F")).join("")
      : "—";
    console.log(
      `  - ${(a.startup_name ?? "—").padEnd(30)} | payment="${(a.payment_status ?? "—").padEnd(16)}" | post.portal=${String(a.portal_access ?? false).padEnd(5)} | founder.portal=${founderPortalStr} | discount=${a.discount_percent ?? 0}%`
    );
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
