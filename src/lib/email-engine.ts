import { Resend } from "resend";
import { getAutomationRules, type TriggerEvent } from "@/lib/airtable";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM = process.env.EMAIL_FROM ?? "Modo Fundraising <noreply@impacta.vc>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app").replace(/\/$/, "");

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
            <a href="mailto:hello@impacta.vc" style="color:#a1a1aa;">hello@impacta.vc</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  triggerCondition?: Record<string, string | number>
): Promise<void> {
  const rules = await getAutomationRules(trigger);
  if (!rules.length) return;

  for (const rule of rules) {
    if (!rule.template) continue;
    if (!rule.template.active) continue;

    // Evaluate trigger_condition if present
    if (rule.trigger_condition) {
      try {
        const condition = JSON.parse(rule.trigger_condition) as Record<string, string | number>;
        const match = Object.entries(condition).every(
          ([k, v]) => triggerCondition?.[k]?.toString() === v?.toString()
        );
        if (!match) continue;
      } catch {
        // Malformed condition — skip silently
      }
    }

    const subject = renderTemplate(rule.template.subject, ctx);
    const bodyHtml = renderTemplate(rule.template.body_html, ctx);
    const html = wrapInBaseLayout(bodyHtml);

    const sendFn = async () => {
      await resend.emails.send({ from: FROM, to: toEmail, subject, html });
    };

    if (rule.delay_hours > 0) {
      const ms = rule.delay_hours * 60 * 60 * 1000;
      setTimeout(() => { sendFn().catch(console.error); }, ms);
    } else {
      await sendFn();
    }
  }
}
