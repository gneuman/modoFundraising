import { google } from "googleapis";
import { getAutomationRules, type TriggerEvent } from "@/lib/airtable";

// Portal: magic link, login, /portal/*, /admin/*, landing y resto de páginas
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com"
).replace(/\/$/, "");
// Postula: solo el formulario de postulación
const POSTULA_URL = (
  process.env.NEXT_PUBLIC_POSTULA_URL ?? "https://postula.modofundraising.com"
).replace(/\/$/, "");
const FROM = process.env.GMAIL_FROM ?? "Modo Fundraising <admin@impacta.vc>";

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return google.gmail({ version: "v1", auth });
}

function encodeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  }
  return subject;
}

async function sendViaGmail(to: string, subject: string, html: string) {
  const gmail = getGmailClient();
  const message = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  const raw = Buffer.from(message).toString("base64url");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

// Variables disponibles en los templates
export interface TemplateContext {
  nombre?: string;
  email?: string;
  startup?: string;
  checkout_url?: string;
  portal_url?: string;
  cuota_num?: string;
  id?: string;
  [key: string]: string | undefined;
}

function renderTemplate(str: string, ctx: TemplateContext): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? "");
}

function wrapInBaseLayout(content: string): string {
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

// ─── Helpers HTML (para emails transaccionales sin template en Airtable) ─────

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">${text}</h1>`;
}
function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">${text}</p>`;
}
function btn(url: string, label: string, color = "#2563eb") {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:${color};border-radius:10px;"><a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a></td></tr></table>`;
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />`;
}
function small(text: string) {
  return `<p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">${text}</p>`;
}

// ─── Emails transaccionales ───────────────────────────────────────────────────

export async function sendMagicLink(
  emailAddr: string,
  token: string,
  role: "admin" | "founder",
  validez = "15 minutos",
) {
  const url = `${APP_URL}/api/auth/verify?token=${token}&role=${role}`;
  const html = wrapInBaseLayout(`
    ${h1("Ingresa a tu portal")}
    ${p(`Haz clic en el botón para acceder. Este enlace es válido por <strong>${validez}</strong>. Si expira, te enviaremos uno nuevo automáticamente.`)}
    ${btn(url, "Ingresar al portal →")}
    ${divider()}
    ${small("Si no solicitaste este acceso, ignora este mensaje. Tu cuenta está segura.<br/>¿Problemas? Escríbenos a <a href='mailto:admin@impacta.vc' style='color:#a1a1aa;'>admin@impacta.vc</a>")}
  `);
  await sendViaGmail(emailAddr, "Tu enlace de acceso a Modo Fundraising 2026", html);
}

export async function sendReferralRequest(
  referralEmail: string,
  referralName: string,
  founderName: string,
  startupName: string,
) {
  const html = wrapInBaseLayout(`
    ${h1(`Hola ${referralName}`)}
    ${p(`<strong>${founderName}</strong> de <strong>${startupName}</strong> te agregó como recomendador en su postulación a Modo Fundraising 2026.`)}
    ${p("Tu recomendación suma puntos a su perfil. Si los conoces y puedes respaldarlos, responde a este email o escríbenos.")}
    ${divider()}
    <a href="mailto:admin@impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Contactar al equipo →</a>
    ${small("— Equipo Impacta VC")}
  `);
  await sendViaGmail(referralEmail, `${founderName} te pidió una recomendación en Modo Fundraising 2026`, html);
}

// ─── Funciones vía Airtable automation rules ──────────────────────────────────

export async function sendApplicationConfirmation(
  emailAddr: string,
  firstName: string,
) {
  // Primero intenta usar reglas configurables en Airtable
  const rules = await getAutomationRules("application_received");
  const hasActiveRule = rules.some((r) => r.template?.active);

  if (hasActiveRule) {
    await sendAutomationEmail("application_received", emailAddr, {
      nombre: firstName,
      email: emailAddr,
    });
    return;
  }

  // Fallback transaccional: garantiza que el postulante reciba confirmación
  // aunque no haya regla configurada en Airtable.
  console.log(`[application_received] no active rule — using transactional fallback to ${emailAddr}`);
  const html = wrapInBaseLayout(`
    ${h1(`Recibimos tu postulación, ${firstName} 🚀`)}
    ${p("Gracias por postular a <strong>Modo Fundraising 2026</strong>. Tu aplicación quedó registrada en nuestro sistema.")}
    ${p("Nuestro equipo la revisará en los próximos días y te contactaremos por este mismo email con los siguientes pasos.")}
    ${divider()}
    ${p("Si tienes alguna duda, escríbenos a <a href='mailto:admin@impacta.vc' style='color:#2563eb;'>admin@impacta.vc</a>.")}
    ${small("— Equipo Impacta VC")}
  `);
  await sendViaGmail(emailAddr, "Recibimos tu postulación a Modo Fundraising 2026", html);
}

export async function sendAdmissionEmail(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
) {
  await sendAutomationEmail("admission_approved", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
}

export async function sendCouponLink(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  _discountPercent: number,
) {
  await sendAutomationEmail("admission_approved", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
}

export async function sendRejectionEmail(emailAddr: string, firstName: string) {
  await sendAutomationEmail("admission_rejected", emailAddr, {
    nombre: firstName,
    email: emailAddr,
  });
}

export async function sendAdmissionFollowUp(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  followUpNumber: number,
) {
  const trigger = followUpNumber === 1 ? "follow_up_1" : "follow_up_2";
  await sendAutomationEmail(trigger, emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
}

export async function sendFormAbandonado(
  emailAddr: string,
  firstName: string,
  postulacionId?: string,
) {
  // Con id: link que recupera el draft desde Airtable (cross-device).
  // Sin id: raíz del formulario (recupera solo vía localStorage en el mismo navegador).
  const apply_url = postulacionId
    ? `${POSTULA_URL}/apply/${postulacionId}`
    : `${POSTULA_URL}/`;
  await sendAutomationEmail("form_abandonado", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    apply_url,
  });
}

export async function sendOnboardingEmail(
  emailAddr: string,
  firstName: string,
  portalUrl: string,
) {
  await sendAutomationEmail("onboarding", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    portal_url: portalUrl,
  });
}

// Correo a un founder cuando una misión pasa a status "Activa".
// Se dispara desde el webhook /api/airtable/mision-activada (WI-1623).
// Variables disponibles en el template: nombre, mision_titulo, mision_descripcion,
// fecha_limite, portal_url.
export async function sendMisionActivadaEmail(
  emailAddr: string,
  firstName: string,
  mision: { titulo?: string; descripcion?: string; fecha_limite?: string },
  portalUrl: string,
) {
  const { formatFechaConAnio } = await import("@/lib/timezone");
  await sendAutomationEmail("mision_activada", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    mision_titulo: mision.titulo ?? "",
    mision_descripcion: mision.descripcion ?? "",
    // ISO crudo (2026-07-07T16:00:00.000Z) → "lunes, 7 de julio de 2026 · 12:00 p. m."
    // formateado a America/Santiago desde timezone.ts para consistencia con el resto del portal.
    fecha_limite: formatFechaConAnio(mision.fecha_limite) ?? "",
    portal_url: portalUrl,
  });
}

// Recordatorio de sesión a un founder. Transaccional directo (NO depende de
// AutomationRules de Airtable) para que funcione aunque no haya template
// configurado. Cubre los tres avisos de sesión: 1h antes, al comenzar, y 24h
// antes (jueves). El copy cambia según `modo`.
//
// Lo mandan los crons de sesión (WI-1636 / WI-1637 / WI-1638). El post a Slack
// NO se hace aquí — lo hace n8n con el JSON que devuelve cada cron.
export async function sendSesionRecordatorioEmail(
  emailAddr: string,
  firstName: string,
  data: {
    titulo: string;
    cuando: string; // fecha/hora ya formateada (America/Santiago)
    link: string;
    modo: "1h" | "start" | "24h";
  },
): Promise<void> {
  const copy = {
    "1h": {
      subject: `En 1 hora: ${data.titulo}`,
      h: `En 1 hora empieza: ${data.titulo}`,
      intro: "La sesión de hoy comienza en aproximadamente una hora. Deja todo listo para conectarte.",
      cta: "Entrar a la sesión →",
      color: "#2563eb",
    },
    start: {
      subject: `¡Empezamos! ${data.titulo}`,
      h: `¡Empezamos ahora! ${data.titulo}`,
      intro: "La sesión está comenzando. Entra al vivo cuando quieras.",
      cta: "Entrar ahora →",
      color: "#16a34a",
    },
    "24h": {
      subject: `Mañana: ${data.titulo} — prepara tus preguntas`,
      h: `Mañana es la sesión: ${data.titulo}`,
      intro:
        "La sesión es mañana. Aprovecha para preparar tus preguntas — mientras más específicas, más valor sacas del vivo.",
      cta: "Ver detalles en el portal →",
      color: "#7c3aed",
    },
  }[data.modo];

  const html = wrapInBaseLayout(`
    ${h1(copy.h)}
    ${p(`Hola ${firstName},`)}
    ${p(copy.intro)}
    ${data.cuando ? p(`🗓️ <strong>${data.cuando}</strong>`) : ""}
    ${btn(data.link, copy.cta, copy.color)}
    ${divider()}
    ${small("¿Dudas? Escríbenos a <a href='mailto:admin@impacta.vc' style='color:#a1a1aa;'>admin@impacta.vc</a>")}
  `);
  await sendViaGmail(emailAddr, copy.subject, html);
}

export async function sendPaymentConfirmation(
  emailAddr: string,
  firstName: string,
  installment: number,
) {
  const trigger =
    installment === 2
      ? "invoice_paid_cuota2"
      : installment === 3
        ? "invoice_paid_cuota3"
        : "checkout_completed";
  await sendAutomationEmail(trigger, emailAddr, {
    nombre: firstName,
    email: emailAddr,
    cuota_num: String(installment),
  });
}

export async function sendPaymentFailedEmail(
  emailAddr: string,
  firstName: string,
  attempt: number,
  portalUrl: string,
) {
  const trigger =
    attempt === 1
      ? "payment_failed_1"
      : attempt === 2
        ? "payment_failed_2"
        : "payment_failed_3";
  await sendAutomationEmail(trigger, emailAddr, {
    nombre: firstName,
    email: emailAddr,
    portal_url: portalUrl,
  });
}

export async function sendChurnEmail(
  emailAddr: string,
  firstName: string,
  _postulacionId?: string,
) {
  await sendAutomationEmail("subscription_cancelled", emailAddr, {
    nombre: firstName,
    email: emailAddr,
  });
}

export async function sendPortalDeactivatedEmail(
  emailAddr: string,
  firstName: string,
) {
  await sendAutomationEmail("portal_deactivated", emailAddr, {
    nombre: firstName,
    email: emailAddr,
  });
}

/**
 * Dispara todas las reglas activas para un evento dado,
 * renderiza el template con el contexto y envía el email.
 *
 * Si una regla tiene delay_hours > 0, el envío se difiere usando setTimeout.
 * Para delays >1h en producción se recomienda usar un job queue externo.
 */
// Renderiza un template (con datos dummy si no se pasan), lo envuelve en el
// layout y lo manda al email indicado. Bypassea AutomationRules: útil para
// que el admin pruebe cómo se ve un correo sin tener que disparar el evento.
export async function sendTestTemplateEmail(
  template: { subject: string; body_html: string },
  toEmail: string,
  ctx?: TemplateContext,
): Promise<void> {
  const defaultCtx: TemplateContext = {
    nombre: "Gabriel",
    email: toEmail,
    startup: "Startup de prueba",
    checkout_url: `${APP_URL}/checkout/dummy-token`,
    portal_url: `${APP_URL}/portal`,
    cuota_num: "1",
    apply_url: `${POSTULA_URL}/apply`,
  };
  const finalCtx = { ...defaultCtx, ...(ctx ?? {}) };

  const subject = `[PRUEBA] ${renderTemplate(template.subject, finalCtx)}`;
  const bodyHtml = renderTemplate(template.body_html, finalCtx);
  const html = wrapInBaseLayout(bodyHtml);
  await sendViaGmail(toEmail, subject, html);
}

export async function sendAutomationEmail(
  trigger: TriggerEvent,
  toEmail: string,
  ctx: TemplateContext,
  triggerCondition?: Record<string, string | number>,
): Promise<void> {
  console.log(`[automation] trigger=${trigger} to=${toEmail}`);
  const rules = await getAutomationRules(trigger);
  if (!rules.length) {
    console.warn(`[automation] no rules found for trigger=${trigger} — email NOT sent to ${toEmail}`);
    return;
  }

  for (const rule of rules) {
    if (!rule.template) {
      console.warn(`[automation] rule id=${rule.id} has no template, skipping`);
      continue;
    }
    if (!rule.template.active) {
      console.warn(`[automation] rule id=${rule.id} template is inactive, skipping`);
      continue;
    }

    // Evaluate trigger_condition if present
    if (rule.trigger_condition) {
      try {
        const condition = JSON.parse(rule.trigger_condition) as Record<
          string,
          string | number
        >;
        const match = Object.entries(condition).every(
          ([k, v]) => triggerCondition?.[k]?.toString() === v?.toString(),
        );
        if (!match) {
          console.log(`[automation] rule id=${rule.id} condition not met, skipping`);
          continue;
        }
      } catch {
        console.warn(`[automation] rule id=${rule.id} malformed trigger_condition, skipping`);
      }
    }

    const subject = renderTemplate(rule.template.subject, ctx);
    const bodyHtml = renderTemplate(rule.template.body_html, ctx);
    const html = wrapInBaseLayout(bodyHtml);

    const sendFn = async () => {
      const start = Date.now();
      console.log(`[automation] sending trigger=${trigger} to=${toEmail} subject="${subject}"`);
      try {
        await sendViaGmail(toEmail, subject, html);
        console.log(`[automation] sent ok trigger=${trigger} to=${toEmail} ms=${Date.now() - start}`);
      } catch (err) {
        console.error(`[automation] FAILED trigger=${trigger} to=${toEmail} ms=${Date.now() - start}`, err);
        throw err;
      }
    };

    if (rule.delay_hours > 0) {
      console.log(`[automation] deferring trigger=${trigger} to=${toEmail} delay=${rule.delay_hours}h`);
      const ms = rule.delay_hours * 60 * 60 * 1000;
      setTimeout(() => {
        sendFn().catch(console.error);
      }, ms);
    } else {
      await sendFn();
    }
  }
}
