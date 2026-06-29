/**
 * Update solo el template "rechazo" en Airtable, agregando el link a la clase
 * de Intro a Venture Capital. No toca el resto de templates.
 * Ejecutar: npx tsx scripts/update-rejection-template.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

const NEW_BODY = `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Gracias por tomarte el tiempo de postular a Modo Fundraising 2026 y por el interés en ser parte de esta edición 🙏</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Luego de revisar tu postulación, hemos decidido no avanzar en esta oportunidad. El programa está diseñado para startups en etapa activa de levantamiento de capital, con base tecnológica y enfocadas en rondas de venture capital — y creemos que el momento y el fit no son los ideales para ti hoy.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Esto no significa que no haya un espacio para ti en el ecosistema Impacta VC. Para que no te pierdas nuestras próximas iniciativas, síguenos en nuestras redes sociales 📲: <a href="https://www.linkedin.com/company/impacta-vc" style="color:#2563eb;">LinkedIn</a> / <a href="https://www.instagram.com/impacta.vc" style="color:#2563eb;">Instagram</a></p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Como agradecimiento por tu interés, te dejamos nuestra clase de <a href="https://drive.google.com/file/d/1p_76vYcDqTSGC24nEgEqEzPNmh4wJbbx/view?usp=drive_link" style="color:#2563eb;font-weight:600;text-decoration:underline;">Introducción al Venture Capital</a> para que sigas aprendiendo sobre el mundo del fundraising 🎥</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">El ecosistema LatAm lo construimos entre todos, y esperamos que los caminos se crucen pronto.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Mucho éxito en este camino! 🚀</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`;

async function main() {
  console.log("Buscando template 'rechazo' en Email Templates MF26...");

  const existing = await base("Email Templates MF26")
    .select({ filterByFormula: `{name} = "rechazo"`, maxRecords: 1 })
    .firstPage();

  if (!existing.length) {
    console.error("✗ No se encontró el template con name='rechazo'");
    process.exit(1);
  }

  const record = existing[0];
  console.log(`  ✓ Encontrado: ${record.id}`);
  console.log(`  Asunto actual: ${record.get("subject")}`);

  await base("Email Templates MF26").update(record.id, {
    body_html: NEW_BODY,
  } as never);

  console.log("✓ Template 'rechazo' actualizado con link a clase de Intro a VC");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
