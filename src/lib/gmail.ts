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
  const start = Date.now();
  console.log(`[email] sending to=${to} subject="${subject}"`);
  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: buildRawEmail(to, subject, html) },
    });
    console.log(`[email] sent ok to=${to} messageId=${res.data.id} ms=${Date.now() - start}`);
  } catch (err) {
    console.error(`[email] FAILED to=${to} subject="${subject}" ms=${Date.now() - start}`, err);
    throw err;
  }
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
    ${p("Mientras tanto, síguenos en nuestras redes para estar al tanto de novedades:")}
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
    "¡Felicitaciones! Estás admitido/a a Modo Fundraising 2026 🎉",
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

export async function sendRejectionEmail(emailAddr: string, firstName: string) {
  await sendEmail(
    emailAddr,
    "Tu postulación a Modo Fundraising 2026",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("Gracias por tomarte el tiempo de postular a Modo Fundraising 2026 y por el interés en ser parte de esta edición 🙏")}
    ${p("Luego de revisar tu postulación, hemos decidido no avanzar en esta oportunidad. El programa está diseñado para startups en etapa activa de levantamiento de capital, con base tecnológica y enfocadas en rondas de venture capital — y creemos que el momento y el fit no son los ideales para ti hoy.")}
    ${p("Esto no significa que no haya un espacio para ti en el ecosistema Impacta VC. Como primer paso, te compartimos esta clase de introducción al venture capital de nuestra edición 2025, que puede ser un gran punto de partida:")}
    ${btn("https://drive.google.com/file/d/1p_76vYcDqTSGC24nEgEqEzPNmh4wJbbx/view?usp=drive_link", "Ver clase de introducción →", "#2563eb")}
    ${p("Y para que no te pierdas nuestras próximas iniciativas, síguenos en nuestras redes sociales 📲:")}
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;"><a href="https://www.linkedin.com/company/impacta-vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">LinkedIn →</a></td>
      <td><a href="https://www.instagram.com/impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Instagram →</a></td>
    </tr></table>
    ${divider()}
    ${p("El ecosistema LatAm lo construimos entre todos, y esperamos que los caminos se crucen pronto.")}
    ${small("¡Mucho éxito en este camino! 🚀<br/>El equipo de Modo Fundraising — Impacta VC")}
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
    "¿Pudieron revisar su admisión? 👀",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("Les escribimos porque quedó pendiente su inscripción a Modo Fundraising 2026 y no queremos que pierdan su lugar.")}
    ${p("Fueron admitidos porque su startup tiene el perfil y el momento para sacarle el máximo provecho a este programa. Creemos que puede marcar una diferencia real en su proceso de fundraising 🚀")}
    ${p("Solo queda un paso. Completen su inscripción acá:")}
    ${btn(checkoutUrl, "Completar inscripción →", "#d97706")}
    ${divider()}
    ${small("Cualquier duda, escríbannos.<br/>El equipo de Modo Fundraising — Impacta VC")}
  `),
  );
}

// V1: se envía inmediatamente al confirmar el pago. El portal aún no tiene clases cargadas.
export async function sendOnboardingEmail(
  emailAddr: string,
  firstName: string,
  portalUrl: string,
) {
  await sendEmail(
    emailAddr,
    "¡Bienvenido/a a Modo Fundraising 2026! 🎉",
    email(`
    ${badge("✅ Inscripción confirmada", "#2563eb")}
    <div style="height:16px;"></div>
    ${h1(`¡Bienvenido/a, ${firstName}!`)}
    ${p("¡Esto es real! Estamos muy emocionados de tenerlos acá 🎉")}
    ${p("Ya tienen acceso a su portal. Por ahora, hay una cosa importante que hacer:")}
    ${p("<strong>Inviten a su equipo.</strong> Dentro del portal encontrarán la sección para sumar a los miembros de su startup que participarán junto a ustedes.")}
    ${btn(portalUrl, "Acceder al portal →")}
    ${divider()}
    ${small("Cualquier duda, escríbannos.<br/>El equipo de Modo Fundraising — Impacta VC")}
  `),
  );
}

// V2: se envía por cron job a todos los inscritos cuando el portal esté listo con clases y calendario.
export async function sendOnboardingEmailV2(
  emailAddr: string,
  firstName: string,
  portalUrl: string,
) {
  await sendEmail(
    emailAddr,
    "¡Llegó el momento! El programa arranca el 30 de junio 🚀",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("¡Esto es real! En pocos días comienzan las semanas que van a transformar la forma en que llevan su fundraising. Estamos muy emocionados de tenerlos acá 🎉")}
    ${p("Antes del 30 de junio, hay cuatro cosas que necesitan hacer para llegar listos al día uno:")}
    <ol style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#52525b;line-height:2;">
      <li><strong>Regístrense en el portal de Founders</strong> — Su espacio central durante todo el programa: clases en vivo, grabaciones, misiones, pagos y todo lo que viene.</li>
      <li><strong>Inviten a su equipo</strong> — Dentro del portal encontrarán la sección para sumar a los miembros de su startup que participarán junto a ustedes.</li>
      <li><strong>Agreguen las sesiones a su calendario 📆</strong> — En la sección de clases encontrarán un botón para agregar cada sesión directamente. Háganlo ahora y protejan ese tiempo.</li>
      <li><strong>Vengan con todo 💪</strong> — Los founders que más aprovechan el programa son los que llegan comprometidos, hacen las misiones y participan activamente.</li>
    </ol>
    ${p("Al final de estas semanas, la diferencia no es el mercado ni el timing — son las skills que adquirieron. Ese es el objetivo: que se gradúen con las herramientas para cerrar esta ronda y las que vienen.")}
    ${btn(portalUrl, "Ir al portal →")}
    ${divider()}
    ${small("El 30 de junio nos vemos adentro. ¡Va a ser un gran camino! 🙌<br/>Cualquier duda, escríbannos.<br/>El equipo de Modo Fundraising — Impacta VC")}
  `),
  );
}

export async function sendPaymentConfirmation(
  emailAddr: string,
  firstName: string,
  installment: number,
) {
  const subjects: Record<number, string> = {
    1: "Pago recibido - ¡bienvenido/a al programa! 🎉",
    2: "Pago recibido - seguimos adelante 💪",
    3: "Último pago recibido - esto ya es tuyo 🎉",
  };
  const bodies: Record<number, string> = {
    1: `${h1(`Hola ${firstName},`)}${p("Confirmamos que recibimos tu primer pago. ¡Estamos muy contentos de tenerte acá! 🚀")}`,
    2: `${h1(`Hola ${firstName},`)}${p("Confirmamos que recibimos tu segundo pago. ¡Vamos con todo! 🚀")}`,
    3: `${h1(`Hola ${firstName},`)}${p("Confirmamos tu último pago. Ya tienes el programa completo por delante 🙌")}${p("Ahora es momento de enfocarte en lo que importa: ejecutar, conectar y cerrar tu ronda. Estamos acá para acompañarte hasta el final.")}`,
  };
  await sendEmail(
    emailAddr,
    subjects[installment] ?? subjects[1],
    email(`
    ${bodies[installment] ?? bodies[1]}
    ${divider()}
    ${small("Cualquier duda, escríbenos.<br/>El equipo de Modo Fundraising — Impacta VC")}
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
    "Tuvimos un problema con tu pago 💳",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("Te escribimos porque no pudimos procesar tu último pago de Modo Fundraising 2026.")}
    ${p("Puede ser algo simple — una tarjeta vencida, un límite alcanzado. Si necesitas ayuda para resolverlo, escríbenos a <a href='mailto:nmacchiavello@impacta.vc' style='color:#2563eb;'>nmacchiavello@impacta.vc</a> y lo solucionamos juntos.")}
    ${divider()}
    ${small("El equipo de Modo Fundraising — Impacta VC")}
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
    "Confirmamos tu baja del Modo Fundraising 2026",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("Confirmamos que procesamos tu desuscripción de Modo Fundraising 2026.")}
    ${p("Sabemos que el camino del fundraising tiene sus tiempos y que cada startup tiene sus propias prioridades. Esperamos que los caminos se vuelvan a cruzar en alguna de nuestras próximas iniciativas 🙌")}
    ${divider()}
    ${small("Cualquier duda, escríbenos.<br/>El equipo de Modo Fundraising — Impacta VC")}
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
    "Tu acceso a Modo Fundraising 2026 fue suspendido 😔",
    email(`
    ${h1(`Hola ${firstName},`)}
    ${p("Lamentablemente, al no haber podido procesar tu pago luego de varios intentos, tuvimos que darte de baja del programa.")}
    ${p("Esperamos que los caminos se vuelvan a cruzar en alguna de nuestras próximas iniciativas. Si crees que hubo un error o quieres conversar, escríbenos a <a href='mailto:nmacchiavello@impacta.vc' style='color:#2563eb;'>nmacchiavello@impacta.vc</a>.")}
    ${divider()}
    ${small("El equipo de Modo Fundraising — Impacta VC")}
  `),
  );
}
