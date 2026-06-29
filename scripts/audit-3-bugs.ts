/**
 * Audit de 3 bugs reportados 2026-06-05:
 *  1. form-reminder no marca form_reminder_sent_at
 *  2. followup admisión no se manda / no marca follow_up_1_sent
 *  3. Zavia Bio aparece "Generar Checkout" pero ya pagó completo
 *
 * Uso: npx tsx scripts/audit-3-bugs.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;

async function listFieldsOf(tableName: string): Promise<string[]> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await res.json();
  const tabla = data.tables.find((t: { name: string }) => t.name === tableName);
  if (!tabla) { console.log(`❌ tabla "${tableName}" no existe`); return []; }
  return tabla.fields.map((f: { name: string; type: string }) => `${f.name} (${f.type})`);
}

async function main() {
  console.log("\n═══ Audit 3 bugs ═══\n");

  // ── Bug 1: campos del cron form-reminder ─────────────────────────────────
  console.log("──── 1. Esquema de Postulaciones MF26 — campos relevantes ────");
  const fields = await listFieldsOf("Postulaciones MF26");
  const relevant = [
    "form_reminder_sent_at",
    "follow_up_1_sent", "follow_up_1_sent_at",
    "follow_up_2_sent", "follow_up_2_sent_at",
    "admitted_at",
  ];
  for (const want of relevant) {
    const found = fields.find((f) => f.toLowerCase().startsWith(want.toLowerCase() + " "));
    console.log(`  ${want.padEnd(28)} → ${found ?? "❌ NO EXISTE"}`);
  }
  console.log();

  // ── Bug 2: postulaciones admitidas que deberían estar en followup ────────
  console.log("──── 2. Admitidas con/sin follow-up marcado ────");
  const base = new Airtable({ apiKey: PAT }).base(BASE);
  const recs = await base("Postulaciones MF26")
    .select({ filterByFormula: `{status}="Admitida"` })
    .all();
  console.log(`  Total admitidas: ${recs.length}`);
  let conFU1 = 0, conFU2 = 0, sinAdmittedAt = 0;
  for (const r of recs) {
    const f = r.fields as Record<string, unknown>;
    if (f.follow_up_1_sent) conFU1++;
    if (f.follow_up_2_sent) conFU2++;
    if (!f.admitted_at) sinAdmittedAt++;
  }
  console.log(`  con follow_up_1_sent=true: ${conFU1}`);
  console.log(`  con follow_up_2_sent=true: ${conFU2}`);
  console.log(`  SIN admitted_at:           ${sinAdmittedAt}  ← bloqueador del cron`);
  console.log();
  console.log("  Detalle por admitida:");
  for (const r of recs.slice(0, 10)) {
    const f = r.fields as Record<string, unknown>;
    const lookupEmail = (f["email (from founder_record)"] as string[])?.[0]
      ?? (f["email"] as string) ?? "?";
    const startup = (f["startup_name (from startup_record)"] as string[])?.[0]
      ?? (f.startup_name as string) ?? "?";
    console.log(
      `  • ${startup.padEnd(25)} ${lookupEmail.padEnd(35)}  admitted_at=${f.admitted_at ?? "VACÍO"}  fu1=${f.follow_up_1_sent ?? false}  fu1_at=${f.follow_up_1_sent_at ?? "-"}`
    );
  }
  console.log();

  // ── Bug 3: Zavia Bio ─────────────────────────────────────────────────────
  console.log("──── 3. Zavia Bio en Postulaciones MF26 ────");
  const zavia = recs.find((r) => {
    const f = r.fields as Record<string, unknown>;
    const startup = (f["startup_name (from startup_record)"] as string[])?.[0]
      ?? (f.startup_name as string) ?? "";
    return startup.toLowerCase().includes("zavia");
  });
  if (!zavia) {
    // buscar entre TODAS las postulaciones
    const all = await base("Postulaciones MF26").select().all();
    const z = all.find((r) => {
      const f = r.fields as Record<string, unknown>;
      const startup = (f["startup_name (from startup_record)"] as string[])?.[0]
        ?? (f.startup_name as string) ?? "";
      return startup.toLowerCase().includes("zavia");
    });
    if (z) {
      const f = z.fields as Record<string, unknown>;
      console.log(`  id: ${z.id}`);
      console.log(`  startup_name: ${(f["startup_name (from startup_record)"] as string[])?.[0] ?? f.startup_name}`);
      console.log(`  status:          ${f.status}`);
      console.log(`  payment_status:  ${f.payment_status}`);
      console.log(`  total_cuotas:    ${f.total_cuotas}`);
      console.log(`  discount_percent:${f.discount_percent}`);
      console.log(`  stripe_customer: ${f.stripe_customer_id ?? "(vacío)"}`);
      console.log(`  stripe_sub:      ${f.stripe_subscription_id ?? "(vacío)"}`);
    } else {
      console.log("  ❌ no encontrada en Postulaciones MF26");
    }
  } else {
    const f = zavia.fields as Record<string, unknown>;
    console.log(`  id: ${zavia.id}`);
    console.log(`  payment_status:  ${f.payment_status}`);
    console.log(`  total_cuotas:    ${f.total_cuotas}`);
  }

  // Pagos de Zavia en Pagos MF26
  console.log();
  console.log("──── Zavia Bio en Pagos MF26 ────");
  const pagos = await base("Pagos MF26").select().all();
  const zPagos = pagos.filter((p) => {
    const f = p.fields as Record<string, unknown>;
    const sn = (f.startup_name as string) ?? "";
    const em = (f.email as string) ?? "";
    return sn.toLowerCase().includes("zavia") || em.toLowerCase().includes("zavia");
  });
  console.log(`  ${zPagos.length} pagos encontrados:`);
  for (const p of zPagos) {
    const f = p.fields as Record<string, unknown>;
    console.log(`  • cuota ${f.cuota} · US$${f.amount} · ${f.status} · ${f.paid_at} · sn="${f.startup_name}" email="${f.email}"`);
  }
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });
