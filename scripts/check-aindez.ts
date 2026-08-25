/**
 * READ-ONLY. Diagnostico completo de una startup/founder por nombre o email.
 * Uso: npx tsx scripts/check-aindez.ts <texto a buscar>
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAllApplications, getAllPagos } from "../src/lib/airtable";

const q = (process.argv[2] ?? "aindez").toLowerCase();

async function main() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  const hits = apps.filter((a) =>
    [a.startup_name, a.email, a.first_name, a.last_name, ...(a.all_founder_emails ?? [])]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)),
  );

  console.log(`\n=== Busqueda: "${q}" — ${hits.length} coincidencia(s) ===\n`);

  for (const a of hits) {
    console.log(`Startup:        ${a.startup_name}`);
    console.log(`Contacto:       ${a.first_name} ${a.last_name} <${a.email}>`);
    console.log(`Postulacion ID: ${a.id}`);
    console.log(`STATUS:         ${a.status}`);
    console.log(`payment_status: ${a.payment_status ?? "—"}`);
    console.log(`total_cuotas:   ${a.total_cuotas ?? "VACIO (el sistema asume 3)"}`);
    console.log(`portal_access:  ${a.portal_access}`);
    console.log(`stripe_sub:     ${a.stripe_subscription_id ?? "—"}`);
    console.log(`stripe_cust:    ${a.stripe_customer_id ?? "—"}`);
    console.log(`payment_failed_at:   ${a.payment_failed_at ?? "—"}`);
    console.log(`payment_resolved_at: ${a.payment_resolved_at ?? "—"}`);
    console.log(`recordatorios: 1=${a.payment_reminder_1_at ?? "—"} 2=${a.payment_reminder_2_at ?? "—"} 3=${a.payment_reminder_3_at ?? "—"}`);
    console.log(`cofounders:     ${(a.all_founder_emails ?? []).join(", ") || "—"}`);

    const mios = pagos
      .filter((p) => (p.email ?? "").toLowerCase().trim() === (a.email ?? "").toLowerCase().trim())
      .sort((x, y) => (x.paid_at ?? "").localeCompare(y.paid_at ?? ""));

    console.log(`\n  PAGOS registrados (${mios.length}):`);
    if (!mios.length) console.log("    (ninguno)");
    for (const p of mios) {
      console.log(`    cuota ${p.cuota ?? "?"} · $${p.amount ?? "?"} · ${(p.paid_at ?? "").slice(0, 10)} · inv=${p.stripe_invoice_id ?? "—"} · status=${p.status ?? "—"}`);
    }
    const suma = mios.reduce((s, p) => s + (p.amount ?? 0), 0);
    console.log(`    TOTAL PAGADO: $${suma}`);
    console.log("\n" + "─".repeat(78) + "\n");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
