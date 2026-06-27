/**
 * Update v2: refina el punto 3 del template de onboarding.
 *  - Quita el discurso interno de "tandas + cero bombardeo"
 *  - Punto 3 ahora pide agregar a contactos para que las 26 invitaciones lleguen bien
 *  - Elimina el punto 5 (queda absorbido por el 3)
 *  - Vuelve "cinco cosas" → "cuatro cosas"
 *
 * Uso:
 *   npx tsx scripts/update-onboarding-template-v2.ts            # dry-run
 *   npx tsx scripts/update-onboarding-template-v2.ts --apply
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const APPLY = process.argv.includes("--apply");
const TEMPLATE_ID = "recZWUnLsjv4cAE5o";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

const NEW_BODY = `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Esto es real! En pocos días comienzan las semanas que van a transformar la forma en que llevan su fundraising. Estamos muy emocionados de tenerlos aquí 🎉</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#18181b;">Antes del 30 de junio, hay cuatro cosas que necesitan hacer para llegar listos al día uno:</p>
<ol style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#52525b;line-height:2;">
  <li><strong>Regístrense en el Portal de Founders</strong> — <a href="{{portal_url}}" style="color:#2563eb;">{{portal_url}}</a> — su espacio central durante todo el programa.</li>
  <li><strong>Inviten a su equipo</strong> — dentro del portal encontrarán la sección para sumar a los miembros de su startup.</li>
  <li><strong>Agreguen <a href="mailto:admin@impacta.vc" style="color:#2563eb;">admin@impacta.vc</a> a sus contactos</strong> 📆 — les vamos a mandar las invitaciones de las 26 sesiones vía Google Calendar. Para que les lleguen bien (sin avisos de "remitente desconocido"), guárdennos como contacto.</li>
  <li><strong>Vengan con todo</strong> 💪 — los founders que más aprovechan el programa son los que llegan comprometidos, hacen las misiones y participan activamente.</li>
</ol>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#2563eb;border-radius:10px;">
    <a href="{{portal_url}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Acceder al portal →</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">El 30 de junio nos vemos adentro. ¡Va a ser un gran camino! 🙌</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;"><strong>¿Nos confirman que les llegó este correo?</strong> Respondan con un OK para cerrar el círculo y asegurarnos de que están adentro. 🙌</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`.trim();

async function main() {
  console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Template: ${TEMPLATE_ID}\n`);

  const before = await base("Email Templates MF26").find(TEMPLATE_ID);
  const beforeBody = (before.fields as Record<string, unknown>).body_html as string;
  console.log("ANTES (largo):", beforeBody.length, "chars");
  console.log("DESPUÉS (largo):", NEW_BODY.length, "chars\n");

  if (!APPLY) {
    console.log("DRY-RUN. Preview del nuevo body_html:\n");
    console.log("─".repeat(60));
    console.log(NEW_BODY);
    console.log("─".repeat(60));
    console.log("\nPara aplicar:");
    console.log("  npx tsx scripts/update-onboarding-template-v2.ts --apply");
    return;
  }

  await base("Email Templates MF26").update(TEMPLATE_ID, {
    body_html: NEW_BODY,
  } as never);

  console.log("✓ Template actualizado en Airtable.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
