/**
 * Inspect: imprime el template de onboarding actual desde Airtable.
 * Uso: npx tsx scripts/inspect-onboarding-template.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

async function main() {
  const reglas = await base("Automation Rules MF26")
    .select({ filterByFormula: `{trigger_event} = "onboarding"` })
    .all();

  for (const r of reglas) {
    const f = r.fields as Record<string, unknown>;
    console.log("─".repeat(60));
    console.log("Regla:", r.id);
    console.log("  active:", f.active);
    console.log("  name:", f.name);
    console.log("  template_id:", f.template_id);
    const tids = f.template_id as string[] | undefined;
    if (tids?.[0]) {
      const tpl = await base("Email Templates MF26").find(tids[0]);
      const tf = tpl.fields as Record<string, unknown>;
      console.log("\n  Template:", tpl.id);
      console.log("    name:", tf.name);
      console.log("    active:", tf.active);
      console.log("    subject:", tf.subject);
      console.log("    body_html:\n");
      console.log(tf.body_html);
    }
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
