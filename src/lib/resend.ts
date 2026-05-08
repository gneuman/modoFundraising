import { Resend } from "resend";
import { sendAutomationEmail } from "@/lib/email-engine";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM = process.env.EMAIL_FROM ?? "Modo Fundraising <noreply@impacta.vc>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app").replace(/\/$/, "");

// Magic link no usa automation rules — se mantiene estático
export async function sendMagicLink(emailAddr: string, token: string, role: "admin" | "founder") {
  const url = `${APP_URL}/api/auth/verify?token=${token}&role=${role}`;
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "Tu enlace de acceso a Modo Fundraising 2026",
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
<tr><td align="center"><table width="100%" style="max-width:560px;">
<tr><td style="padding-bottom:24px;" align="center">
  <img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="160" style="display:block;" />
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Ingresá a tu portal</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Haz clic en el botón para acceder. Este enlace es válido por <strong>15 minutos</strong> y solo puede usarse una vez.</p>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#2563eb;border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Ingresar al portal →</a>
    </td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />
  <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">Si no solicitaste este acceso, ignorá este mensaje. Tu cuenta está segura.<br/>¿Problemas? Escribinos a <a href="mailto:hello@impacta.vc" style="color:#a1a1aa;">hello@impacta.vc</a></p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Modo Fundraising 2026 · Impacta VC<br/><a href="mailto:hello@impacta.vc" style="color:#a1a1aa;">hello@impacta.vc</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`,
  });
}

// Referral no usa automation rules — es para terceros, no founders
export async function sendReferralRequest(
  referralEmail: string,
  referralName: string,
  founderName: string,
  startupName: string
) {
  await resend.emails.send({
    from: FROM,
    to: referralEmail,
    subject: `${founderName} te pidió una recomendación en Modo Fundraising 2026`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
<tr><td align="center"><table width="100%" style="max-width:560px;">
<tr><td style="padding-bottom:24px;" align="center">
  <img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="160" style="display:block;" />
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Hola ${referralName}</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;"><strong>${founderName}</strong> de <strong>${startupName}</strong> te agregó como recomendador en su postulación a Modo Fundraising 2026.</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Tu recomendación suma puntos a su perfil. Si los conoces y puedes respaldarlos, responde a este email o escríbenos.</p>
  <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />
  <a href="mailto:hello@impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Contactar al equipo →</a>
  <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">— Equipo Impacta VC</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Modo Fundraising 2026 · Impacta VC</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
  });
}

// ─── Wrappers sobre el motor de automatización ────────────────────────────────

export async function sendApplicationConfirmation(emailAddr: string, firstName: string) {
  await sendAutomationEmail("application_received", emailAddr, { nombre: firstName, email: emailAddr });
}

export async function sendAdmissionEmail(emailAddr: string, firstName: string, checkoutUrl: string) {
  await sendAutomationEmail("admission_approved", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
}

export async function sendRejectionEmail(emailAddr: string, firstName: string) {
  await sendAutomationEmail("admission_rejected", emailAddr, { nombre: firstName, email: emailAddr });
}

export async function sendAdmissionFollowUp(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  followUpNumber: number
) {
  const trigger = followUpNumber === 1 ? "follow_up_1" : "follow_up_2";
  await sendAutomationEmail(trigger, emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
}

export async function sendOnboardingEmail(emailAddr: string, firstName: string, portalUrl: string) {
  await sendAutomationEmail("onboarding", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    portal_url: portalUrl,
  });
}

export async function sendPaymentConfirmation(emailAddr: string, firstName: string, installment: number) {
  const triggerMap = {
    1: "checkout_completed",
    2: "invoice_paid_cuota2",
    3: "invoice_paid_cuota3",
  } as const;
  const trigger = triggerMap[installment as 1 | 2 | 3] ?? "checkout_completed";
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
  _portalUrl: string
) {
  const triggerMap = {
    1: "payment_failed_1",
    2: "payment_failed_2",
    3: "payment_failed_3",
  } as const;
  const trigger = triggerMap[attempt as 1 | 2 | 3] ?? "payment_failed_1";
  await sendAutomationEmail(trigger, emailAddr, { nombre: firstName, email: emailAddr });
}

export async function sendChurnEmail(emailAddr: string, firstName: string, postulacionId?: string) {
  await sendAutomationEmail("subscription_cancelled", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    id: postulacionId ?? "",
  });
}

export async function sendPortalDeactivatedEmail(emailAddr: string, firstName: string) {
  await sendAutomationEmail("portal_deactivated", emailAddr, { nombre: firstName, email: emailAddr });
}

export async function sendCouponLink(
  emailAddr: string,
  firstName: string,
  checkoutUrl: string,
  discountPercent: number
) {
  // Cupones usan el mismo trigger que admisión (admission_approved) pero con checkout_url que ya incluye el cupón.
  // Si se quiere un template distinto para beca/descuento, crear regla con trigger_condition {"discount": "true"}.
  await sendAutomationEmail("admission_approved", emailAddr, {
    nombre: firstName,
    email: emailAddr,
    checkout_url: checkoutUrl,
  });
  // Nota: para beca 100% el checkout_url devuelve directo al portal — el template debe adaptarse si se crea una regla específica.
  void discountPercent;
}
