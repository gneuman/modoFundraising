import { google } from "googleapis";
import { getAutomationRules, type TriggerEvent } from "@/lib/airtable";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app"
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

// ─── Funciones compatibles con gmail.ts ──────────────────────────────────────

export async function sendApplicationConfirmation(
  emailAddr: string,
  firstName: string,
) {
  await sendAutomationEmail("application_received", emailAddr, {
    nombre: firstName,
    email: emailAddr,
  });
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
