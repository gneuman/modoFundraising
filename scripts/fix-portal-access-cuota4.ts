/**
 * Reactiva portal_access en los FOUNDERS de startups inscritas que pagaron pero
 * quedaron con el flag apagado (huella del churn indebido por el bug de cuota 4).
 *
 * Por que importa aunque "ya entren al portal":
 *   - El layout los deja pasar por status="Inscrita", asi que el acceso se ve bien.
 *   - PERO getFounderEmailsByStartup filtra por {portal_access} = 1. Con el flag
 *     apagado el founder es INVISIBLE para el cron de Calendar (sus invitaciones
 *     nunca se re-agregan → "se les borran") y para el onboarding.
 *
 * Criterio conservador — solo toca founders que cumplen TODO:
 *   1. Su postulacion esta en "Inscrita" / "Invitada institucional"
 *   2. Tienen >= 1 pago registrado en la tabla Pagos
 *   3. Su founder.portal_access esta en false/vacio
 * Nunca toca "Churn By Founder" (baja voluntaria) ni a quien no ha pagado.
 *
 * SEGURO POR DEFECTO: sin --apply solo imprime. Con --apply escribe.
 *
 * Uso:
 *   npx tsx scripts/fix-portal-access-cuota4.ts            # dry-run
 *   npx tsx scripts/fix-portal-access-cuota4.ts --apply    # escribe
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getAllApplications,
  getAllPagos,
  getFounderIdsByPostulacion,
  updateFounderAccess,
} from "../src/lib/airtable";
import Airtable from "airtable";

const APPLY = process.argv.includes("--apply");

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);
const FOUNDERS = "tblTif15ehnRN4K74"; // Founders MF26 (src/lib/airtable.ts)

async function main() {
  console.log(`\n=== Reactivar portal_access ${APPLY ? "(APLICANDO)" : "(DRY-RUN)"} ===\n`);

  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  const pagosPorEmail = new Map<string, number>();
  for (const p of pagos) {
    const e = (p.email ?? "").toLowerCase().trim();
    if (e) pagosPorEmail.set(e, (pagosPorEmail.get(e) ?? 0) + 1);
  }

  const inscritas = apps.filter(
    (a) => a.email && (a.status === "Inscrita" || a.status === "Invitada institucional"),
  );

  let tocados = 0;
  let yaOk = 0;

  for (const app of inscritas) {
    const nPagos = pagosPorEmail.get((app.email ?? "").toLowerCase().trim()) ?? 0;
    if (nPagos === 0) continue; // no ha pagado: no le devolvemos acceso

    const founderIds = await getFounderIdsByPostulacion(app.id!).catch(() => [] as string[]);
    if (!founderIds.length) continue;

    for (const fid of founderIds) {
      let rec;
      try {
        rec = await base(FOUNDERS).find(fid);
      } catch {
        continue;
      }
      const f = rec.fields as Record<string, unknown>;
      const acceso = f.portal_access === true;
      const femail = (f.email as string) ?? "(sin email)";

      if (acceso) { yaOk++; continue; }

      console.log(
        `  ${(app.startup_name ?? "—").slice(0, 22).padEnd(22)} ${femail.padEnd(34)} ` +
        `portal_access: false → TRUE   (pagos=${nPagos}, status=${app.status})`,
      );
      tocados++;

      if (APPLY) await updateFounderAccess(fid, true);
    }
  }

  console.log(`\nFounders a reactivar: ${tocados}   ·   ya estaban OK: ${yaOk}`);
  if (!APPLY) {
    console.log(`\nDRY-RUN: no se escribio nada. Para aplicar:`);
    console.log(`  npx tsx scripts/fix-portal-access-cuota4.ts --apply\n`);
  } else {
    console.log(`\nListo. Reactivados: ${tocados}`);
    console.log(`Siguiente: re-invitar a Calendar (ahora ya son visibles para el cron).\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
