/**
 * Backfill de asistencias desde webhooks de StreamYard (OP-1923).
 *
 * Reconcilia sesiones PASADAS: toma un JSON con los webhooks de StreamYard y liga
 * cada asistente a su (startup, clase) usando la MISMA lógica que el endpoint en
 * vivo (`resolveAsistenciaStreamYard` en src/lib/airtable.ts). Útil para las dos
 * primeras sesiones que quedaron con asistencias huérfanas antes de tener el webhook.
 *
 * El endpoint /api/streamyard/asistencia es el camino permanente (Zapier → webhook);
 * este script es solo para backfill manual de lo ya ocurrido.
 *
 * El payload de cada asistente llega como { body: "<texto tipo YAML>" }.
 *
 * USO:
 *   npx tsx scripts/ingesta-asistencias-streamyard.ts webhooks.json           # dry-run
 *   npx tsx scripts/ingesta-asistencias-streamyard.ts webhooks.json --apply   # escribe
 *
 * `webhooks.json`: array de { body }, un solo { body }, o array de strings.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import * as fs from "fs";
import { resolveAsistenciaStreamYard, upsertAsistencia } from "../src/lib/airtable";

const APPLY = process.argv.includes("--apply");
const fileArg = process.argv.find((a) => a.endsWith(".json"));

// Parser del `body` string del webhook (idéntico al del endpoint).
function parseBody(body: string) {
  const kv = new Map<string, string>();
  for (const line of body.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    kv.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }
  let startup: string | null = null;
  const cf = kv.get("customFields");
  if (cf) {
    try {
      const arr = JSON.parse(cf.replace(/'/g, '"')) as { name: string; value: string }[];
      startup = arr.find((c) => c.name?.toLowerCase() === "startup")?.value ?? null;
    } catch {
      const m = cf.match(/'name'\s*:\s*'Startup'\s*,\s*'value'\s*:\s*'([^']*)'/i);
      startup = m?.[1] ?? null;
    }
  }
  if (startup !== null && startup.trim() === "") startup = null;
  return {
    email: kv.get("email")?.toLowerCase().trim() || null,
    firstName: kv.get("firstName")?.trim() || null,
    lastName: kv.get("lastName")?.trim() || null,
    startupName: startup,
    webinarId: kv.get("webinarId")?.trim() || null,
    webinarTitle: kv.get("webinarTitle")?.trim() || null,
    createdAt: kv.get("createdAt")?.trim() || null,
  };
}

async function main() {
  if (!fileArg) {
    console.error("Falta el JSON. Uso: npx tsx scripts/ingesta-asistencias-streamyard.ts webhooks.json [--apply]");
    process.exit(1);
  }
  console.log(`\n📥 Backfill StreamYard — ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}\n`);

  const raw = JSON.parse(fs.readFileSync(fileArg, "utf8"));
  const items: unknown[] = Array.isArray(raw) ? raw : [raw];
  const bodies = items.map((it) => {
    if (typeof it === "string") return it;
    if (it && typeof it === "object" && "body" in it) return String((it as { body: unknown }).body);
    throw new Error(`Entrada no reconocida: ${JSON.stringify(it).slice(0, 80)}`);
  });

  const attendees = bodies.map(parseBody);
  console.log(`Asistentes en el archivo: ${attendees.length}\n`);

  let ligados = 0;
  let creados = 0;
  const noResueltos: { email: string | null; startupName: string | null; webinarTitle: string | null; reason: string }[] = [];
  const viaCount = new Map<string, number>();

  for (const a of attendees) {
    const r = await resolveAsistenciaStreamYard(a);
    if (!r.startupId || !r.claseId) {
      noResueltos.push({
        email: a.email,
        startupName: a.startupName,
        webinarTitle: a.webinarTitle,
        reason: !r.claseId ? "no_clase" : "no_startup",
      });
      continue;
    }
    ligados++;
    viaCount.set(r.viaStartup ?? "?", (viaCount.get(r.viaStartup ?? "?") ?? 0) + 1);
    if (APPLY) {
      await upsertAsistencia({
        startupId: r.startupId,
        claseId: r.claseId,
        asistio: true,
        fecha: (a.createdAt ?? new Date().toISOString()).slice(0, 10),
        notas: `StreamYard: ${a.webinarTitle ?? ""}`,
      });
      creados++;
    }
  }

  console.log(`─── RESUMEN ───`);
  console.log(`Ligables (startup+clase): ${ligados}`);
  for (const [via, n] of viaCount) console.log(`   por ${via}: ${n}`);
  console.log(`No resueltos:             ${noResueltos.length}`);
  if (noResueltos.length) {
    console.log(`\n⚠️  NO RESUELTOS (email | startup escrita | webinar | motivo):`);
    for (const n of noResueltos)
      console.log(`   ${n.email ?? "(sin email)"}  |  "${n.startupName ?? ""}"  |  "${(n.webinarTitle ?? "").slice(0, 40)}"  |  ${n.reason}`);
  }

  if (APPLY) {
    console.log(`\n✅ Upserts aplicados: ${creados} (dedup automático por startup+clase).\n`);
  } else {
    console.log(`\n(DRY-RUN) No se escribió nada. Corre con --apply para aplicar.\n`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
