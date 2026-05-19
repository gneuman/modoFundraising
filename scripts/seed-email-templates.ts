/**
 * Seed script: carga los 14 templates de email y las reglas de automatización por defecto.
 * Ejecutar: npx tsx scripts/seed-email-templates.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!
);

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app").replace(/\/$/, "");

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    name: "pago_cuota_1",
    label: "Agradecimiento Primer Pago",
    subject: "¡Ya estás dentro de Modo Fundraising 2026! 🚀",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Tu inscripción está confirmada y estamos muy emocionados de acompañarte en este camino! 💸</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Las startups que logran levantar capital saben que el fundraising no es algo que se hace en paralelo — es un modo que se activa, se trabaja con foco y se ejecuta con estrategia. Ese momento es ahora, y estamos acá para acompañarte.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Muy pronto, antes del inicio el 30 de junio, recibirás todo el onboarding con acceso al portal, el cronograma completo y todo lo que necesitas para llegar listo/a al día uno 💪</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda antes de eso, responde este mail y te respondemos.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Nos vemos el 30! 🙌</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "pago_cuota_2",
    label: "Confirmación Segunda Cuota",
    subject: "Pago recibido — seguimos adelante 💪",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Confirmamos que recibimos tu segundo pago. ¡Vamos con todo! 🚀</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbenos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "pago_cuota_3",
    label: "Confirmación Tercera Cuota",
    subject: "Último pago recibido — esto ya es tuyo 🎉",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Confirmamos tu último pago. Ya tienes el programa completo por delante 🙌</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Ahora es momento de enfocarte en lo que importa: ejecutar, conectar y cerrar tu ronda. Estamos acá para acompañarte hasta el final.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "pago_fallido_1",
    label: "Cobranza 1",
    subject: "Tuvimos un problema con tu pago 💳",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Te escribimos porque no pudimos procesar tu último pago de Modo Fundraising 2026.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Puede ser algo simple — una tarjeta vencida, un límite alcanzado. Si necesitas ayuda para resolverlo, escríbenos a <a href="mailto:nmacchiavello@impacta.vc" style="color:#2563eb;">nmacchiavello@impacta.vc</a> y lo solucionamos juntos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "pago_fallido_2",
    label: "Cobranza 2",
    subject: "Tu pago sigue pendiente ⚠️",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Te recordamos que tu pago de Modo Fundraising 2026 aún está pendiente y queremos asegurarnos de que puedas seguir en el programa.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Si hay algo en lo que podamos ayudarte, estamos disponibles en <a href="mailto:nmacchiavello@impacta.vc" style="color:#2563eb;">nmacchiavello@impacta.vc</a> 🙌</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "pago_fallido_3",
    label: "Cobranza 3",
    subject: "Último aviso — pago pendiente",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Este es nuestro último recordatorio sobre tu pago pendiente de Modo Fundraising 2026.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Si quieres seguir en el programa, escríbenos a <a href="mailto:nmacchiavello@impacta.vc" style="color:#2563eb;">nmacchiavello@impacta.vc</a> y buscamos una solución juntos 💪</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "portal_desactivado",
    label: "Aviso Baja por No Pago",
    subject: "Tu acceso a Modo Fundraising 2026 fue suspendido 😔",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Lamentablemente, al no haber podido procesar tu pago luego de varios intentos, tuvimos que darte de baja del programa.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Esperamos que los caminos se vuelvan a cruzar en alguna de nuestras próximas iniciativas. Si crees que hubo un error o quieres conversar, escríbenos a <a href="mailto:nmacchiavello@impacta.vc" style="color:#2563eb;">nmacchiavello@impacta.vc</a>.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "baja_confirmada",
    label: "Confirmación Desuscripción + Encuesta",
    subject: "Confirmamos tu baja del Modo Fundraising 2026",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Confirmamos que procesamos tu desuscripción de Modo Fundraising 2026.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Sabemos que el camino del fundraising tiene sus tiempos y que cada startup tiene sus propias prioridades. Esperamos que los caminos se vuelvan a cruzar en alguna de nuestras próximas iniciativas 🙌</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#18181b;">¿Cuál fue el motivo principal de tu baja?</p>
<table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
  <tr><td style="padding:4px 0;"><a href="${APP_URL}/feedback/unsubscribe?id={{id}}&reason=precio" style="font-size:14px;color:#2563eb;text-decoration:none;">💸 El precio no se ajusta a mi presupuesto actual</a></td></tr>
  <tr><td style="padding:4px 0;"><a href="${APP_URL}/feedback/unsubscribe?id={{id}}&reason=tiempo" style="font-size:14px;color:#2563eb;text-decoration:none;">⏰ No tengo el tiempo que requiere el programa</a></td></tr>
  <tr><td style="padding:4px 0;"><a href="${APP_URL}/feedback/unsubscribe?id={{id}}&reason=prioridades" style="font-size:14px;color:#2563eb;text-decoration:none;">🎯 Mis prioridades cambiaron y el fundraising no es el foco ahora</a></td></tr>
  <tr><td style="padding:4px 0;"><a href="${APP_URL}/feedback/unsubscribe?id={{id}}&reason=ronda_cerrada" style="font-size:14px;color:#2563eb;text-decoration:none;">✅ Ya levanté mi ronda</a></td></tr>
  <tr><td style="padding:4px 0;"><a href="${APP_URL}/feedback/unsubscribe?id={{id}}&reason=expectativas" style="font-size:14px;color:#2563eb;text-decoration:none;">🤔 El programa no era lo que esperaba</a></td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbenos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "rechazo",
    label: "Rechazo de Postulación",
    subject: "Tu postulación a Modo Fundraising 2026",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Gracias por tomarte el tiempo de postular a Modo Fundraising 2026 y por el interés en ser parte de esta edición 🙏</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Luego de revisar tu postulación, hemos decidido no avanzar en esta oportunidad. El programa está diseñado para startups en etapa activa de levantamiento de capital, con base tecnológica y enfocadas en rondas de venture capital — y creemos que el momento y el fit no son los ideales para ti hoy.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Esto no significa que no haya un espacio para ti en el ecosistema Impacta VC. Para que no te pierdas nuestras próximas iniciativas, síguenos en nuestras redes sociales 📲: <a href="https://www.linkedin.com/company/impacta-vc" style="color:#2563eb;">LinkedIn</a> / <a href="https://www.instagram.com/impacta.vc" style="color:#2563eb;">Instagram</a></p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Como agradecimiento por tu interés, te dejamos nuestra clase de <a href="https://drive.google.com/file/d/1p_76vYcDqTSGC24nEgEqEzPNmh4wJbbx/view?usp=drive_link" style="color:#2563eb;font-weight:600;text-decoration:underline;">Introducción al Venture Capital</a> para que sigas aprendiendo sobre el mundo del fundraising 🎥</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">El ecosistema LatAm lo construimos entre todos, y esperamos que los caminos se crucen pronto.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Mucho éxito en este camino! 🚀</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "admision",
    label: "Admisión con Link de Pago",
    subject: "¡Felicitaciones! Estás admitido/a a Modo Fundraising 2026 🎉",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Excelentes noticias! Revisamos tu postulación y queremos que seas parte de esta edición 🚀</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Estás en el momento indicado para entrar en modo fundraising: construir tu narrativa, afinar tu estrategia y conectar con los inversionistas correctos. Pero más allá de esta ronda, lo que te llevas es el skill para levantar capital ronda tras ronda — porque el fundraising no es un evento, es una competencia que se aprende y se perfecciona.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Solo queda un paso para hacer esto oficial: asegura tu cupo completando el pago.</p>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#16a34a;border-radius:10px;">
    <a href="{{checkout_url}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Completar inscripción →</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Los cupos son limitados y no queremos que te quedes fuera 🙌</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbenos.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Nos vemos adentro! 🙌</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "follow_up_1",
    label: "Follow-up Admisión 1",
    subject: "¿Pudieron revisar su admisión? 👀",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Les escribimos porque quedó pendiente su inscripción a Modo Fundraising 2026 y no queremos que pierdan su lugar.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Fueron admitidos porque su startup tiene el perfil y el momento para sacarle el máximo provecho a este programa. Creemos que puede marcar una diferencia real en su proceso de fundraising 🚀</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Solo queda un paso.</p>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#d97706;border-radius:10px;">
    <a href="{{checkout_url}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Completar inscripción →</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbannos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "follow_up_2",
    label: "Follow-up Admisión 2",
    subject: "Su cupo está a punto de liberarse ⏳",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Este es nuestro último aviso antes de liberar su cupo 🙌</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Sabemos que hay mil cosas en paralelo cuando se lleva una startup. Pero el fundraising necesita foco y este programa está diseñado exactamente para eso. No dejen que el timing juegue en contra.</p>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#dc2626;border-radius:10px;">
    <a href="{{checkout_url}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirmar inscripción →</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbannos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "onboarding",
    label: "Onboarding Portal",
    subject: "¡Llegó el momento! El programa arranca el 30 de junio 🚀",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">Hola {{nombre}},</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">¡Esto es real! En pocos días comienzan las semanas que van a transformar la forma en que llevan su fundraising. Estamos muy emocionados de tenerlos acá 🎉</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#18181b;">Antes del 30 de junio, hay cuatro cosas que necesitan hacer para llegar listos al día uno:</p>
<ol style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#52525b;line-height:2;">
  <li><strong>Regístrense en el Portal de Founders</strong> — <a href="{{portal_url}}" style="color:#2563eb;">{{portal_url}}</a> — su espacio central durante todo el programa.</li>
  <li><strong>Inviten a su equipo</strong> — dentro del portal encontrarán la sección para sumar a los miembros de su startup.</li>
  <li><strong>Agreguen las sesiones a su calendario</strong> 📆 — en la sección de clases encontrarán un botón para agregar cada sesión directamente.</li>
  <li><strong>Vengan con todo</strong> 💪 — los founders que más aprovechan el programa son los que llegan comprometidos, hacen las misiones y participan activamente.</li>
</ol>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#2563eb;border-radius:10px;">
    <a href="{{portal_url}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Acceder al portal →</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">El 30 de junio nos vemos adentro. ¡Va a ser un gran camino! 🙌</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Cualquier duda, escríbannos.</p>
<p style="margin:0;font-size:14px;color:#71717a;">El equipo de Modo Fundraising — Impacta VC</p>`,
    active: true,
  },
  {
    name: "postulacion_recibida",
    label: "Confirmación Postulación",
    subject: "Recibimos tu postulación a Modo Fundraising 2026",
    body_html: `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">¡Gracias, {{nombre}}!</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Tu postulación a <strong>Modo Fundraising 2026</strong> fue recibida. Nuestro equipo la revisará y te contactará en los próximos días.</p>
<hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Mientras tanto, seguinos en nuestras redes para estar al tanto de novedades:</p>
<table cellpadding="0" cellspacing="0"><tr>
  <td style="padding-right:12px;"><a href="https://www.linkedin.com/company/impacta-vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">LinkedIn →</a></td>
  <td><a href="https://www.instagram.com/impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Instagram →</a></td>
</tr></table>
<p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">— Equipo Impacta VC</p>`,
    active: true,
  },
];

// ─── Default automation rules ─────────────────────────────────────────────────

const RULES = [
  { name: "Primer pago → Agradecimiento",      trigger_event: "checkout_completed",    template_name: "pago_cuota_1",       delay_hours: 0, order: 1 },
  { name: "Cuota 2 pagada → Confirmación",      trigger_event: "invoice_paid_cuota2",   template_name: "pago_cuota_2",       delay_hours: 0, order: 1 },
  { name: "Cuota 3 pagada → Confirmación",      trigger_event: "invoice_paid_cuota3",   template_name: "pago_cuota_3",       delay_hours: 0, order: 1 },
  { name: "Pago fallido intento 1",             trigger_event: "payment_failed_1",      template_name: "pago_fallido_1",     delay_hours: 0, order: 1 },
  { name: "Pago fallido intento 2",             trigger_event: "payment_failed_2",      template_name: "pago_fallido_2",     delay_hours: 0, order: 1 },
  { name: "Pago fallido intento 3",             trigger_event: "payment_failed_3",      template_name: "pago_fallido_3",     delay_hours: 0, order: 1 },
  { name: "Portal desactivado por no pago",     trigger_event: "portal_deactivated",    template_name: "portal_desactivado", delay_hours: 0, order: 1 },
  { name: "Desuscripción confirmada",           trigger_event: "subscription_cancelled",template_name: "baja_confirmada",    delay_hours: 0, order: 1 },
  { name: "Admisión aprobada",                  trigger_event: "admission_approved",    template_name: "admision",           delay_hours: 0, order: 1 },
  { name: "Postulación rechazada",              trigger_event: "admission_rejected",    template_name: "rechazo",            delay_hours: 0, order: 1 },
  { name: "Follow-up admisión 1",               trigger_event: "follow_up_1",           template_name: "follow_up_1",        delay_hours: 0, order: 1 },
  { name: "Follow-up admisión 2",               trigger_event: "follow_up_2",           template_name: "follow_up_2",        delay_hours: 0, order: 1 },
  { name: "Onboarding portal",                  trigger_event: "onboarding",            template_name: "onboarding",         delay_hours: 0, order: 1 },
  { name: "Postulación recibida",               trigger_event: "application_received",  template_name: "postulacion_recibida", delay_hours: 0, order: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertTemplate(data: typeof TEMPLATES[0]) {
  const existing = await base("Email Templates MF26")
    .select({ filterByFormula: `{name} = "${data.name}"`, maxRecords: 1 })
    .firstPage();
  if (existing.length) {
    await base("Email Templates MF26").update(existing[0].id, data as never);
    console.log(`  ↻ template updated: ${data.name}`);
    return existing[0].id;
  }
  const record = await base("Email Templates MF26").create(data as never);
  console.log(`  + template created: ${data.name}`);
  return record.id;
}

async function upsertRule(data: typeof RULES[0], templateIdMap: Map<string, string>) {
  const templateId = templateIdMap.get(data.template_name);
  if (!templateId) { console.warn(`  ! template not found for rule: ${data.name}`); return; }

  const existing = await base("Automation Rules MF26")
    .select({ filterByFormula: `{name} = "${data.name}"`, maxRecords: 1 })
    .firstPage();

  const fields = {
    name: data.name,
    trigger_event: data.trigger_event,
    template_id: [templateId],
    delay_hours: data.delay_hours,
    channel: "email",
    active: true,
    order: data.order,
  };

  if (existing.length) {
    await base("Automation Rules MF26").update(existing[0].id, fields as never);
    console.log(`  ↻ rule updated: ${data.name}`);
  } else {
    await base("Automation Rules MF26").create(fields as never);
    console.log(`  + rule created: ${data.name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding email templates...");
  const templateIdMap = new Map<string, string>();

  for (const t of TEMPLATES) {
    const id = await upsertTemplate(t);
    templateIdMap.set(t.name, id);
  }

  console.log("\nSeeding automation rules...");
  for (const r of RULES) {
    await upsertRule(r, templateIdMap);
  }

  console.log("\nDone ✓");
}

main().catch((err) => { console.error(err); process.exit(1); });
