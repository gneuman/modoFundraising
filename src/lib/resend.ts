import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM = process.env.EMAIL_FROM ?? "Modo Fundraising <noreply@impacta.vc>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app").replace(/\/$/, "");

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
          <img src="${APP_URL}/logo-mf.png" alt="Modo Fundraising" width="160" style="display:block;" />
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

export async function sendMagicLink(emailAddr: string, token: string, role: "admin" | "founder") {
  const url = `${APP_URL}/api/auth/verify?token=${token}&role=${role}`;
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "Tu enlace de acceso a Modo Fundraising 2026",
    html: email(`
      ${h1("Ingresá a tu portal")}
      ${p("Haz clic en el botón para acceder. Este enlace es válido por <strong>15 minutos</strong> y solo puede usarse una vez.")}
      ${btn(url, "Ingresar al portal →")}
      ${divider()}
      ${small("Si no solicitaste este acceso, ignorá este mensaje. Tu cuenta está segura.<br/>¿Problemas? Escribinos a <a href='mailto:hello@impacta.vc' style='color:#a1a1aa;'>hello@impacta.vc</a>")}
    `),
  });
}

export async function sendApplicationConfirmation(emailAddr: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "Recibimos tu postulación a Modo Fundraising 2026",
    html: email(`
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
  });
}

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
    html: email(`
      ${h1(`Hola ${referralName}`)}
      ${p(`<strong>${founderName}</strong> de <strong>${startupName}</strong> te agregó como recomendador en su postulación a Modo Fundraising 2026.`)}
      ${p("Tu recomendación suma puntos a su perfil. Si los conocés y podés respaldarlos, respondé a este email o escribinos.")}
      ${divider()}
      <a href="mailto:hello@impacta.vc" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Contactar al equipo →</a>
      ${small("— Equipo Impacta VC")}
    `),
  });
}

export async function sendAdmissionEmail(emailAddr: string, firstName: string, checkoutUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "¡Tu startup fue admitida a Modo Fundraising 2026!",
    html: email(`
      ${badge("🎉 Admitida", "#16a34a")}
      <div style="height:16px;"></div>
      ${h1(`¡Felicitaciones, ${firstName}!`)}
      ${p("Tu startup fue <strong>seleccionada para Modo Fundraising 2026</strong>. El programa tiene un costo de <strong>US$349/mes por 3 meses</strong>.")}
      ${p("Completá tu inscripción antes de que tu lugar expire:")}
      ${btn(checkoutUrl, "Completar inscripción →", "#16a34a")}
      ${divider()}
      ${small("¿Preguntas? Respondé a este email y te contestamos. Tu lugar está reservado por tiempo limitado.")}
    `),
  });
}

export async function sendRejectionEmail(emailAddr: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "Actualización sobre tu postulación a Modo Fundraising 2026",
    html: email(`
      ${h1(`Hola ${firstName}`)}
      ${p("Gracias por tu interés en <strong>Modo Fundraising 2026</strong>. Tras revisar tu postulación, en esta ocasión no podemos continuar con tu candidatura.")}
      ${p("Esto no es un reflejo de tu potencial. Te animamos a seguir construyendo y esperamos verte en futuras ediciones del programa.")}
      ${divider()}
      ${small("Si tenés preguntas, respondé a este email.<br/>— Equipo Impacta VC")}
    `),
  });
}

export async function sendAdmissionFollowUp(emailAddr: string, firstName: string, checkoutUrl: string, followUpNumber: number) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: `Tu lugar en Modo Fundraising 2026 está por vencer (${followUpNumber}/2)`,
    html: email(`
      ${badge("Recordatorio", "#d97706")}
      <div style="height:16px;"></div>
      ${h1(`${firstName}, tu lugar sigue reservado`)}
      ${p("Aún no completaste tu inscripción a <strong>Modo Fundraising 2026</strong>. Tu lugar está reservado, pero por tiempo limitado.")}
      ${btn(checkoutUrl, "Completar inscripción →", "#d97706")}
      ${divider()}
      ${small("¿Tenés dudas o necesitás hablar con alguien antes de decidir? Respondé este email.<br/>— Equipo Impacta VC")}
    `),
  });
}

export async function sendOnboardingEmail(emailAddr: string, firstName: string, portalUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "¡Bienvenido/a a Modo Fundraising 2026! Tu portal está listo",
    html: email(`
      ${badge("✅ Inscripción confirmada", "#2563eb")}
      <div style="height:16px;"></div>
      ${h1(`¡Bienvenido/a, ${firstName}!`)}
      ${p("Tu inscripción a <strong>Modo Fundraising 2026</strong> está confirmada. Tu portal ya está activo:")}
      ${btn(portalUrl, "Acceder a mi portal →")}
      ${divider()}
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b;">Desde tu portal podés:</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#52525b;line-height:2;">
        <li>Ver el calendario de clases y links de acceso</li>
        <li>Acceder a grabaciones de sesiones anteriores</li>
        <li>Completar y subir tus misiones semanales</li>
        <li>Invitar a otros founders de tu equipo</li>
      </ul>
      ${small("— Equipo Impacta VC")}
    `),
  });
}

export async function sendPaymentConfirmation(emailAddr: string, firstName: string, installment: number) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: `Pago confirmado — Cuota ${installment}/3 Modo Fundraising 2026`,
    html: email(`
      ${badge(`✓ Cuota ${installment}/3 recibida`, "#16a34a")}
      <div style="height:16px;"></div>
      ${h1(`¡Gracias, ${firstName}!`)}
      ${p(`Confirmamos la recepción de tu <strong>cuota ${installment} de 3</strong> para Modo Fundraising 2026.`)}
      ${installment < 3 ? p(`Tu próxima cuota se procesará automáticamente en 30 días.`) : p("Completaste el programa al 100%. ¡Gracias por tu confianza!")}
      ${divider()}
      ${small("¿Dudas sobre tu facturación? Respondé este email.<br/>— Equipo Impacta VC")}
    `),
  });
}

export async function sendPaymentFailedEmail(emailAddr: string, firstName: string, attempt: number, portalUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: `Acción requerida: problema con tu pago (aviso ${attempt}/3)`,
    html: email(`
      ${badge("⚠️ Pago fallido", "#dc2626")}
      <div style="height:16px;"></div>
      ${h1(`Hola ${firstName}, hay un problema con tu pago`)}
      ${p("No pudimos procesar tu cuota mensual de Modo Fundraising 2026. Por favor actualizá tu método de pago para mantener tu acceso al portal.")}
      ${btn(`${portalUrl}/suscripcion`, "Actualizar método de pago →", "#dc2626")}
      ${divider()}
      ${small(`Este es el aviso ${attempt} de 3. Si no se resuelve, tu acceso será suspendido.<br/>¿Necesitás ayuda? Respondé este email.<br/>— Equipo Impacta VC`)}
    `),
  });
}

export async function sendChurnEmail(emailAddr: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: "Tu suscripción a Modo Fundraising 2026 fue cancelada",
    html: email(`
      ${h1(`Hola ${firstName}`)}
      ${p("Tu suscripción a <strong>Modo Fundraising 2026</strong> fue cancelada y tu acceso al portal fue revocado.")}
      ${p("Lamentamos verte partir. ¿Podés contarnos por qué decidiste salir? Tu feedback nos ayuda a mejorar.")}
      <a href="mailto:hello@impacta.vc?subject=Feedback%20Modo%20Fundraising" style="font-size:14px;color:#2563eb;font-weight:500;text-decoration:none;">Enviar feedback →</a>
      ${divider()}
      ${small("— Equipo Impacta VC")}
    `),
  });
}

export async function sendCouponLink(emailAddr: string, firstName: string, checkoutUrl: string, discountPercent: number) {
  const isFullScholarship = discountPercent === 100;
  await resend.emails.send({
    from: FROM,
    to: emailAddr,
    subject: isFullScholarship
      ? "🎓 Tu beca completa para Modo Fundraising 2026"
      : `🎁 ${discountPercent}% de descuento para Modo Fundraising 2026`,
    html: email(`
      ${badge(isFullScholarship ? "🎓 Beca completa" : `🎁 ${discountPercent}% de descuento`, "#7c3aed")}
      <div style="height:16px;"></div>
      ${h1(`Hola ${firstName}`)}
      ${isFullScholarship
        ? p("Tenés una <strong>beca completa</strong> reservada para Modo Fundraising 2026. Tu acceso es gratuito — solo necesitás activarla.")
        : p(`Tenés un <strong>${discountPercent}% de descuento</strong> reservado para Modo Fundraising 2026. Usá el botón para inscribirte con tu beneficio ya aplicado.`)
      }
      ${btn(checkoutUrl, isFullScholarship ? "Activar beca →" : "Inscribirme con descuento →", "#7c3aed")}
      ${divider()}
      ${small("Este enlace es personal e intransferible. ¿Preguntas? Respondé este email.<br/>— Equipo Impacta VC")}
    `),
  });
}
