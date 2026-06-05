/**
 * Lista todas las inscritas con su payment_status, total_cuotas y pagos
 * registrados — para detectar cuáles deberían estar como completadas pero
 * el código las muestra en "Recuperar pagos" por falta de total_cuotas o
 * desajuste entre payment_status y pagos reales.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

async function main() {
  const base = new Airtable({ apiKey: PAT }).base(BASE);
  const [posts, pagos] = await Promise.all([
    base("Postulaciones MF26").select({ filterByFormula: `OR({status}="Inscrita",{status}="Invitada institucional")` }).all(),
    base("Pagos MF26").select().all(),
  ]);

  console.log(`\nInscritas: ${posts.length} · Pagos registrados: ${pagos.length}\n`);

  console.log(`${"Startup".padEnd(28)} ${"Email".padEnd(30)} ${"status".padEnd(18)} cuotas  pagosAT  ¿completa?`);
  console.log("─".repeat(110));

  for (const p of posts) {
    const f = p.fields as Record<string, unknown>;
    const startupName = (f["startup_name (from startup_record)"] as string[])?.[0]
      ?? (f.startup_name as string) ?? "?";
    const email = ((f["email (from founder_record)"] as string[])?.[0]
      ?? (f.email as string) ?? "").toLowerCase();
    const paymentStatus = (f.payment_status as string) ?? "";
    const totalCuotas = f.total_cuotas as number | undefined;
    const discountPercent = f.discount_percent as number | undefined;

    // Pagos asociados
    const myPagos = pagos.filter((pg) => {
      const pf = pg.fields as Record<string, unknown>;
      const sn = (pf.startup_name as string) ?? "";
      const em = ((pf.email as string) ?? "").toLowerCase();
      return em === email || norm(sn) === norm(startupName);
    });

    // Inferir cuota más alta del payment_status
    const cuotaMatch = paymentStatus.match(/Cuota (\d+) pagada/);
    const cuotaEnStatus = cuotaMatch ? parseInt(cuotaMatch[1], 10) : 0;

    const esBeca = paymentStatus === "Beca 100%" || discountPercent === 100;
    const cuotasEfectivas = Math.max(myPagos.length, cuotaEnStatus);
    const totalEfectivo = totalCuotas ?? 3;
    const completa = esBeca ? "(beca)" : (cuotasEfectivas >= totalEfectivo ? "✅ SÍ" : "❌ NO");

    const flag = totalCuotas === undefined ? "⚠ total_cuotas vacío" : "";

    console.log(
      `${startupName.slice(0, 28).padEnd(28)} ${email.slice(0, 30).padEnd(30)} ${paymentStatus.padEnd(18)} ${(totalEfectivo + "").padStart(2)}     ${(myPagos.length + "").padStart(2)}        ${completa}  ${flag}`
    );
  }
  console.log();
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });
