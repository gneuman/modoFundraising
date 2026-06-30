/**
 * Reporta el estado del onboarding para TODOS los founders con portal_access=1.
 * Genera 4 grupos:
 *  - OK_FULL: onboarding_enviado_at + invitado_calendar_at + ingreso al portal
 *  - OK_NO_INGRESO: marcado como enviado e invitado, pero NO ha entrado al portal (probable spam / no abrió)
 *  - PARCIAL: tiene una marca pero no la otra
 *  - PENDIENTE: ninguna marca (nunca corrio el flujo masivo para este founder)
 *
 * Uso: npx tsx scripts/audit-onboarding-status.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ADMIN_EMAIL = "gnb@teknobuilding.com";

const base = new Airtable({ apiKey: PAT }).base(BASE_ID);

interface F {
  id: string;
  email: string;
  nombre: string;
  onboarding: string | null;
  calendarInv: string | null;
  ultimoIngreso: string | null;
}

async function main() {
  const records = await base("Founders MF26")
    .select({
      filterByFormula: `{portal_access} = 1`,
      fields: ["email", "first_name", "last_name", "onboarding_enviado_at", "invitado_calendar_at", "Último Ingreso Portal"],
    })
    .all();

  const founders: F[] = records
    .map((r) => {
      const f = r.fields as Record<string, unknown>;
      const email = ((f.email as string) ?? "").toLowerCase();
      return {
        id: r.id,
        email,
        nombre: `${(f.first_name as string) ?? ""} ${(f.last_name as string) ?? ""}`.trim(),
        onboarding: (f.onboarding_enviado_at as string) ?? null,
        calendarInv: (f.invitado_calendar_at as string) ?? null,
        ultimoIngreso: (f["Último Ingreso Portal"] as string) ?? null,
      };
    })
    .filter((f) => f.email && f.email !== ADMIN_EMAIL);

  const okFull = founders.filter((f) => f.onboarding && f.calendarInv && f.ultimoIngreso);
  const okNoIngreso = founders.filter((f) => f.onboarding && f.calendarInv && !f.ultimoIngreso);
  const parcial = founders.filter((f) => (f.onboarding ? 1 : 0) + (f.calendarInv ? 1 : 0) === 1);
  const pendiente = founders.filter((f) => !f.onboarding && !f.calendarInv);

  console.log(`Total founders con portal_access=1: ${founders.length}\n`);

  console.log(`── OK_FULL (enviado + invitado + ingreso al portal) ──`);
  console.log(`Total: ${okFull.length}`);

  console.log(`\n── OK_NO_INGRESO (marcado como enviado pero NUNCA entró al portal) ──`);
  console.log(`Total: ${okNoIngreso.length}  <- estos son los de mayor riesgo de no haber recibido el correo`);
  for (const f of okNoIngreso) {
    console.log(`  ${f.email.padEnd(40)} | ${f.nombre.padEnd(30)} | onboarding=${f.onboarding?.slice(0,16)} | calendar=${f.calendarInv?.slice(0,16)}`);
  }

  console.log(`\n── PARCIAL (solo onboarding O solo calendar) ──`);
  console.log(`Total: ${parcial.length}`);
  for (const f of parcial) {
    console.log(`  ${f.email.padEnd(40)} | onboarding=${f.onboarding ? "SI" : "NO "} calendar=${f.calendarInv ? "SI" : "NO"}`);
  }

  console.log(`\n── PENDIENTE (nunca corrió el flujo masivo) ──`);
  console.log(`Total: ${pendiente.length}`);
  for (const f of pendiente) {
    console.log(`  ${f.email.padEnd(40)} | ${f.nombre}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
