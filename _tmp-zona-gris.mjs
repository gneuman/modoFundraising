// Read-only. Zoom a los casos raros: pagaron cuota pero sin sub, y valida
// contra Stripe si tienen suscripcion activa real. Tambien revisa Ciudata (doble sub)
// y Zavia (8 pagos sin sub).
import dotenv from "dotenv";
import Airtable from "airtable";
import Stripe from "stripe";
dotenv.config({ path: ".env.local" });

const T = { POSTULACIONES: "tblqj2eJMHpEqLxqv", FOUNDERS: "tblTif15ehnRN4K74", PAGOS: "tblmUbeh3ji4Y5GK7" };
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);
const stripeKey = process.env.STRIPE_MODE === "production" ? process.env.STRIPE_SECRET_KEY_PROD : process.env.STRIPE_SECRET_KEY_TEST;
const stripe = new Stripe(stripeKey);
console.log("STRIPE_MODE:", process.env.STRIPE_MODE, "\n");

// Emails a investigar
const targets = ["ibarutta@leaf-si.com", "leonardo.arroyo@zeii.com", "majo@tophunting.ai", "patricio@aventiasolutions.com", "camila@ciudata.io", "paz@zaviabio.com"];

for (const email of targets) {
  console.log(`\n===== ${email} =====`);
  const custs = await stripe.customers.list({ email, limit: 5 });
  if (!custs.data.length) { console.log("  Stripe: sin customer"); continue; }
  for (const c of custs.data) {
    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
    const subInfo = subs.data.map((s) => `${s.id.slice(0,18)} [${s.status}] cancel_at_period_end=${s.cancel_at_period_end}`);
    const invs = await stripe.invoices.list({ customer: c.id, limit: 20 });
    const paid = invs.data.filter((i) => i.status === "paid");
    console.log(`  customer ${c.id}: subs=[${subInfo.join(" | ") || "ninguna"}] facturas_pagadas=${paid.length}`);
  }
}
