import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = process.env.AIRTABLE_BASE_ID!;
const PAT = process.env.AIRTABLE_PAT!;

async function main() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!res.ok) {
    console.error("Error meta API:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const tabla = data.tables.find((t: { name: string }) => t.name === "Postulaciones MF26");
  if (!tabla) {
    console.error("No se encontró tabla Postulaciones MF26");
    process.exit(1);
  }
  const campos = tabla.fields.map((f: { name: string; type: string }) => `${f.name} (${f.type})`);
  const target = tabla.fields.find((f: { name: string }) => f.name === "form_reminder_sent_at");
  console.log(`Campo form_reminder_sent_at: ${target ? `EXISTE — tipo "${target.type}"` : "NO EXISTE"}`);
  console.log("\nTodos los campos relacionados a fechas/reminder:");
  campos.filter((c: string) => /reminder|sent|_at|fecha|date/i.test(c)).forEach((c: string) => console.log("  " + c));
}
main().catch((e) => { console.error(e); process.exit(1); });
