/**
 * Backfill de stripe_subscription_id (y stripe_customer_id) faltantes en
 * Postulaciones MF26, leyéndolos de Stripe.
 *
 * Motivación: el webhook de cobranza (invoice.payment_failed / succeeded) matchea
 * la postulación por stripe_subscription_id. Si ese campo quedó vacío en Airtable,
 * el webhook no encuentra la postulación y la cobranza falla en silencio.
 * Este script rellena lo que falte para cerrar ese hueco hacia atrás.
 *
 * Estrategia de resolución por postulación sin sub_id:
 *   1) Si tiene stripe_customer_id → buscar su suscripción en Stripe.
 *   2) Si no, buscar el customer en Stripe por email → y de ahí la suscripción.
 *
 * READ-ONLY por defecto (dry-run). Para escribir en Airtable:
 *   npx tsx scripts/backfill-subscription-id.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import Airtable from "airtable";
import { getAllApplications, type PostulacionRecord } from "../src/lib/airtable";

const APPLY = process.argv.includes("--apply");

const stripeKey =
  process.env.STRIPE_MODE === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD!
    : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);
const TABLE = "Postulaciones MF26";

type Resuelto = {
  startup: string;
  email: string;
  recordId: string;
  prevSub: string | null;
  prevCustomer: string | null;
  newSub: string | null;
  newCustomer: string | null;
  via: string;
};

// Suscripción "vigente" preferida: activa/past_due/unpaid antes que canceladas.
async function subDeCustomer(customerId: string): Promise<string | null> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  if (!subs.data.length) return null;
  const pref =
    subs.data.find((s) => ["active", "past_due", "unpaid", "incomplete"].includes(s.status)) ??
    subs.data[0];
  return pref?.id ?? null;
}

async function customerDeEmail(email: string): Promise<string | null> {
  const list = await stripe.customers.list({ email, limit: 5 });
  return list.data[0]?.id ?? null;
}

async function main() {
  console.log(`\n🔁 Backfill stripe_subscription_id — modo Stripe: ${MODE} — ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}\n`);

  const apps = await getAllApplications();

  // Candidatas: inscritas / con algún pago, sin subscription_id guardado.
  const candidatas = apps.filter(
    (a: PostulacionRecord) =>
      !a.stripe_subscription_id &&
      a.email &&
      (a.status === "Inscrita" ||
        a.status === "Invitada institucional" ||
        (a.payment_status && a.payment_status !== "Pendiente")),
  );

  console.log(`Candidatas (sin sub_id): ${candidatas.length}\n`);

  const resueltos: Resuelto[] = [];
  const sinResolver: { startup: string; email: string; motivo: string }[] = [];

  for (const a of candidatas) {
    const startup = a.startup_name ?? "—";
    const email = a.email!;
    let customerId = a.stripe_customer_id ?? null;
    let via = "";

    try {
      if (!customerId) {
        customerId = await customerDeEmail(email);
        via = "email→customer";
      } else {
        via = "customer(Airtable)";
      }
      if (!customerId) {
        sinResolver.push({ startup, email, motivo: "sin customer en Stripe" });
        continue;
      }

      const subId = await subDeCustomer(customerId);
      if (!subId) {
        sinResolver.push({ startup, email, motivo: `customer ${customerId} sin suscripción` });
        continue;
      }

      resueltos.push({
        startup, email, recordId: a.id!,
        prevSub: a.stripe_subscription_id ?? null,
        prevCustomer: a.stripe_customer_id ?? null,
        newSub: subId,
        newCustomer: a.stripe_customer_id ? null : customerId,
        via,
      });
    } catch (err) {
      sinResolver.push({ startup, email, motivo: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`✅ Resueltos: ${resueltos.length}`);
  for (const r of resueltos) {
    const extra = r.newCustomer ? ` + customer ${r.newCustomer}` : "";
    console.log(`   ${r.startup.padEnd(24)} ${r.email.padEnd(32)} → sub ${r.newSub}${extra}  (${r.via})`);
  }

  if (sinResolver.length) {
    console.log(`\n⚠️  Sin resolver: ${sinResolver.length}`);
    for (const s of sinResolver) {
      console.log(`   ${s.startup.padEnd(24)} ${s.email.padEnd(32)} — ${s.motivo}`);
    }
  }

  if (!APPLY) {
    console.log(`\n(DRY-RUN) No se escribió nada. Corre con --apply para guardar en Airtable.\n`);
    return;
  }

  console.log(`\n✍️  Escribiendo en Airtable...`);
  let ok = 0;
  for (const r of resueltos) {
    const fields: Record<string, unknown> = { stripe_subscription_id: r.newSub };
    if (r.newCustomer) fields.stripe_customer_id = r.newCustomer;
    try {
      await base(TABLE).update(r.recordId, fields as never, { typecast: true });
      ok++;
    } catch (err) {
      console.log(`   ❌ ${r.startup}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n✅ Actualizadas ${ok}/${resueltos.length} postulaciones.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
