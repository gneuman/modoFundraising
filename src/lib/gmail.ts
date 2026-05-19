import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!;
const FROM = process.env.GMAIL_FROM ?? "Modo Fundraising <hola@impacta.vc>";
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app"
).replace(/\/$/, "");

function getOAuth2Client() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return auth;
}

function encodeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  }
  return subject;
}

function buildRawEmail(to: string, subject: string, html: string): string {
  const message = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  return Buffer.from(message).toString("base64url");
}

async function sendEmail(to: string, subject: string, html: string) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawEmail(to, subject, html) },
  });
}

// ─── Base template ────────────────────────────────────────────────────────────

function email(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modo Fundraising 2026</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;" align="center">
          <img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="160" style="display:block;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            Modo Fundraising 2026 · Impacta VC<br/>
            <a href="mailto:admin@impacta.vc" style="color:#a1a1aa;">admin@impacta.vc</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(url: string, label: string, color = "#2563eb") {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:${color};border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">${label}</a>
    </td></tr>
  </table>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">${text}</p>`;
}

function small(text: string) {
  return `<p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />`;
}

function badge(text: string, color = "#2563eb") {
  return `<span style="display:inline-block;background:${color}18;color:${color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.02em;">${text}</span>`;
}

// ─── Emails ───────────────────────────────────────────────────────────────────

export async function sendMagicLink(
  emailAddr: string,
  token: string,
  role: "admin" | "founder",
) {
  const url = `${APP_URL}/api/auth/verify?token=${token}&role=${role}`;
  await sendEmail(
    emailAddr,
    "Tu enlace de acceso a Modo Fundraising 2026",
    email(`
    ${h1("Ingresá a tu portal")}
    ${p("Haz clic en el botón para acceder. Este enlace es válido por <strong>15 minutos</strong> y solo puede usarse una vez.")}
    ${btn(url, "Ingresar al portal →")}
    ${divider()}
    ${small("Si no solicitaste este acceso, ignorá este mensaje. Tu cuenta está segura.<br/>¿Problemas? Escribinos a <a href='mailto:admin@impacta.vc' style='color:#a1a1aa;'>admin@impacta.vc</a>")}
  `),
  );
}

export async function sendApplicationConfirmation(
  emailAddr: string,
  firstName: string,
) {
  await sendEmail(
    emailAddr,
    "Recibimos tu postulación a Modo Fundraising 2026",
    email(`
    ${badge("Postulación recibida", "#16a34a")}
    <div style="height:16px;"></div>
    ${h1(`¡Gracias, ${firstName}!`)}
    ${p("Tu postulación a <strong>Modo Fundraising 2026</strong> fue recibida. Nuestro equipo la revisará y te contactará en los próximos días.")}
    ${divider()}
    ${p("Mientras tanto, seguinos en nuestras redes para estar al tanto de novedades:")}
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;"><a href="https://www.linkedin.com/company/impacta-vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">LinkedIn →</a></td>
      <td><a href="https://www.instagram.com/impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Instagram →</a></td>
    </tr></table>
    ${small("— Equipo Impacta VC")}
  `),
  );
}

export async function sendReferralRequest(
  referralEmail: string,
  referralName: string,
  founderName: string,
  startupName: string,
) {
  await sendEmail(
    referralEmail,
    `${founderName} te pidió una recomendación en Modo Fundraising 2026`,
    email(`
    ${h1(`Hola ${referralName}`)}
    ${p(`<strong>${founderName}</strong> de <strong>${startupName}</strong> te agregó como recomendador en su postulación a Modo Fundraising 2026.`)}
    ${p("Tu recomendación suma puntos a su perfil. Si los conoces y puedes respaldarlos, responde a este email o escríbenos.")}
    ${divider()}
    <a href="mailto:admin@impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Contactar al equipo →</a>
    ${small("— Equipo Impacta VC")}
  `),
  );
}

export async function sendAdmissionEmail(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
) {
  await sendEmail(
    emailAddr,
    "¡Quedaste seleccionada para Modo Fundraising!",
    email(`
    ${badge("🎉 ¡Excelentes noticias!", "#16a34a")}
    <div style="height:16px;"></div>
    ${h1(`Hola ${firstName},`)}
    ${p("Revisamos tu postulación y queremos que seas parte de esta edición 🚀")}
    ${p("Estás en el momento indicado para entrar en modo fundraising: construir tu narrativa, afinar tu estrategia y conectar con los inversionistas correctos. Pero más allá de esta ronda, lo que te llevas es el skill para levantar capital ronda tras ronda — porque el fundraising no es un evento, es una competencia que se aprende y se perfecciona.")}
    ${p("Solo queda un paso para hacer esto oficial: asegura tu cupo completando el pago.")}
    ${btn(checkoutUrl, "Completar inscripción →", "#16a34a")}
    ${p("Los cupos son limitados y no queremos que te quedes fuera 🙌")}
    ${divider()}
    ${small("Cualquier duda, escríbenos.<br/><br/>¡Nos vemos adentro! 🙌<br/>El equipo de Modo Fundraising — Impacta VC")}
  `),
  );
}

export async function sendAdmissionFollowUp(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  followUpNumber: number,
) {
  await sendEmail(
    emailAddr,
    `Tu lugar en Modo Fundraising 2026 está por vencer (${followUpNumber}/2)`,
    email(`
    ${badge("Recordatorio", "#d97706")}
    <div style="height:16px;"></div>
    ${h1(`${firstName}, tu lugar sigue reservado`)}
    ${p("Aún no completaste tu inscripción a <strong>Modo Fundraising 2026</strong>. Tu lugar está reservado, pero por tiempo limitado.")}
    ${btn(checkoutUrl, "Completar inscripción →", "#d97706")}
    ${divider()}
    ${small("¿Tienes dudas o necesitas hablar con alguien antes de decidir? Responde este email.<br/>— Equipo Impacta VC")}
  `),
  );
}

export async function sendOnboardingEmail(
  emailAddr: string,
  firstName: string,
  portalUrl: string,
) {
  await sendEmail(
    emailAddr,
    "¡Bienvenido/a a Modo Fundraising 2026! Tu portal está listo",
    email(`
    ${badge("✅ Inscripción confirmada", "#2563eb")}
    <div style="height:16px;"></div>
    ${h1(`¡Bienvenido/a, ${firstName}!`)}
    ${p("Tu inscripción a <strong>Modo Fundraising 2026</strong> está confirmada. Tu portal ya está activo:")}
    ${btn(portalUrl, "Acceder a mi portal →")}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b;">Desde tu portal puedes:</p>
    <ul style="margin:0;padding-left:20px;font-size:14px;color:#52525b;line-height:2;">
      <li>Ver el calendario de clases y links de acceso</li>
      <li>Acceder a grabaciones de sesiones anteriores</li>
      <li>Completar y subir tus misiones semanales</li>
      <li>Invitar a otros founders de tu equipo</li>
    </ul>
    ${small("— Equipo Impacta VC")}
  `),
  );
}

export async function sendPaymentConfirmation(
  emailAddr: string,
  firstName: string,
  installment: number,
) {
  await sendEmail(
    emailAddr,
    `Pago confirmado — Cuota ${installment}/3 Modo Fundraising 2026`,
    email(`
    ${badge(`✓ Cuota ${installment}/3 recibida`, "#16a34a")}
    <div style="height:16px;"></div>
    ${h1(`¡Gracias, ${firstName}!`)}
    ${p(`Confirmamos la recepción de tu <strong>cuota ${installment} de 3</strong> para Modo Fundraising 2026.`)}
    ${installment < 3 ? p("Tu próxima cuota se procesará automáticamente en 30 días.") : p("Completaste el programa al 100%. ¡Gracias por tu confianza!")}
    ${divider()}
    ${small("¿Dudas sobre tu facturación? Responde este email.<br/>— Equipo Impacta VC")}
  `),
  );
}

export async function sendPaymentFailedEmail(
  emailAddr: string,
  firstName: string,
  attempt: number,
  portalUrl: string,
) {
  await sendEmail(
    emailAddr,
    `Acción requerida: problema con tu pago (aviso ${attempt}/3)`,
    email(`
    ${badge("⚠️ Pago fallido", "#dc2626")}
    <div style="height:16px;"></div>
    ${h1(`Hola ${firstName}, hay un problema con tu pago`)}
    ${p("No pudimos procesar tu cuota mensual de Modo Fundraising 2026. Por favor actualiza tu método de pago para mantener tu acceso al portal.")}
    ${btn(`${portalUrl}/suscripcion`, "Actualizar método de pago →", "#dc2626")}
    ${divider()}
    ${small(`Este es el aviso ${attempt} de 3. Si no se resuelve, tu acceso será suspendido.<br/>¿Necesitas ayuda? Responde este email.<br/>— Equipo Impacta VC`)}
  `),
  );
}

export async function sendChurnEmail(
  emailAddr: string,
  firstName: string,
  _postulacionId?: string,
) {
  await sendEmail(
    emailAddr,
    "Tu suscripción a Modo Fundraising 2026 fue cancelada",
    email(`
    ${h1(`Hola ${firstName}`)}
    ${p("Tu suscripción a <strong>Modo Fundraising 2026</strong> fue cancelada y tu acceso al portal fue revocado.")}
    ${p("Lamentamos verte partir. ¿Puedes contarnos por qué decidiste salir? Tu feedback nos ayuda a mejorar.")}
    <a href="mailto:admin@impacta.vc?subject=Feedback%20Modo%20Fundraising" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Enviar feedback →</a>
    ${divider()}
    ${small("— Equipo Impacta VC")}
  `),
  );
}

export async function sendCouponLink(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  discountPercent: number,
) {
  const isFullScholarship = discountPercent === 100;
  await sendEmail(
    emailAddr,
    "¡Felicitaciones! Estás admitido/a a Modo Fundraising 2026 🎉",
    email(`
      ${badge(isFullScholarship ? "🎓 Beca completa" : "🎉 ¡Excelentes noticias!", "#16a34a")}
      <div style="height:16px;"></div>
      ${h1(`Hola ${firstName},`)}
      ${
        isFullScholarship
          ? p(
              "Tienes una <strong>beca completa</strong> reservada para Modo Fundraising 2026. Tu acceso es gratuito — solo necesitas activarla.",
            )
          : p(
              "¡Excelentes noticias! Revisamos tu postulación y queremos que seas parte de esta edición 🚀 (con beca parcial incluida 😉)",
            )
      }
      ${isFullScholarship ? "" : p("Estás en el momento indicado para entrar en modo fundraising: construir tu narrativa, afinar tu estrategia y conectar con los inversionistas correctos. Pero más allá de esta ronda, lo que te llevas es el skill para levantar capital ronda tras ronda — porque el fundraising no es un evento, es una competencia que se aprende y se perfecciona.")}
      ${p("Solo queda un paso para hacer esto oficial: asegura tu cupo completando el pago a través de este link.")}
      ${btn(checkoutUrl, isFullScholarship ? "Activar beca →" : "Completar inscripción →", "#16a34a")}
      ${p("Los cupos son limitados y no queremos que te quedes fuera 🙌")}
      ${divider()}
      ${small("Cualquier duda, escríbenos.<br/><br/>¡Nos vemos adentro! 🙌<br/>El equipo de Modo Fundraising — Impacta VC")}
    `),
  );
}

export async function sendPortalDeactivatedEmail(
  emailAddr: string,
  firstName: string,
) {
  await sendEmail(
    emailAddr,
    "Tu acceso al portal de Modo Fundraising fue suspendido",
    email(`
    ${badge("⚠️ Acceso suspendido", "#dc2626")}
    <div style="height:16px;"></div>
    ${h1(`Hola ${firstName}`)}
    ${p("Tu acceso al portal de <strong>Modo Fundraising 2026</strong> fue suspendido debido a un problema con tu método de pago que no pudimos resolver.")}
    ${p("Si crees que esto es un error o querés regularizar tu situación, respondé este email y lo resolvemos juntos.")}
    <a href="mailto:admin@impacta.vc?subject=Reactivar%20acceso%20Modo%20Fundraising" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Contactar al equipo →</a>
    ${divider()}
    ${small("— Equipo Impacta VC")}
  `),
  );
}
