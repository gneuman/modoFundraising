import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM = process.env.EMAIL_FROM!;

export async function sendMagicLink(email: string, token: string, role: "admin" | "founder") {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const url = `${base}/auth/verify?token=${token}&role=${role}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Tu acceso a Modo Fundraising 2026",
    html: `<p>Haz clic para ingresar:</p><a href="${url}">${url}</a><p>Válido por 15 minutos.</p>`,
  });
}

export async function sendApplicationConfirmation(email: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "¡Recibimos tu postulación a Modo Fundraising 2026! 🚀",
    html: `
      <h2>¡Hola ${firstName}!</h2>
      <p>Recibimos tu postulación a <strong>Modo Fundraising 2026</strong>. Nuestro equipo la revisará y te contactará por email en los próximos días con los pasos a seguir.</p>
      <p>Mientras tanto, síguenos en <a href="https://www.linkedin.com/company/impacta-vc">LinkedIn</a> e <a href="https://www.instagram.com/impacta.vc">Instagram</a> para estar al tanto de novedades.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
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
    html: `
      <h2>Hola ${referralName},</h2>
      <p><strong>${founderName}</strong> de <strong>${startupName}</strong> te agregó como recomendador en su postulación a <strong>Modo Fundraising 2026</strong>.</p>
      <p>Tu voto de confianza suma puntos a su perfil. Si los conoces y puedes recomendarlos, responde a este email o comunícate con nosotros a <a href="mailto:hello@impacta.vc">hello@impacta.vc</a>.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendAdmissionEmail(email: string, firstName: string, checkoutUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "¡Fuiste admitido/a a Modo Fundraising 2026! 🎉",
    html: `
      <h2>¡Felicitaciones ${firstName}!</h2>
      <p>Tu startup fue <strong>admitida</strong> a <strong>Modo Fundraising 2026</strong>.</p>
      <p>El programa tiene un costo de <strong>US$349/mes por 3 meses</strong>. Completa tu inscripción aquí:</p>
      <p><a href="${checkoutUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Completar inscripción y pago</a></p>
      <p>Si tienes preguntas, responde a este email.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendRejectionEmail(email: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Actualización sobre tu postulación a Modo Fundraising 2026",
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Gracias por tu interés en <strong>Modo Fundraising 2026</strong>. Tras revisar tu postulación, en esta ocasión no podemos continuar con tu candidatura.</p>
      <p>Te animamos a seguir trabajando en tu startup y esperamos verte en futuras ediciones.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendAdmissionFollowUp(email: string, firstName: string, checkoutUrl: string, followUpNumber: number) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Recordatorio: tu lugar en Modo Fundraising 2026 (${followUpNumber}/2)`,
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Te escribimos porque aún no has completado tu inscripción a <strong>Modo Fundraising 2026</strong>.</p>
      <p>Tu lugar está reservado. Completa el pago aquí:</p>
      <p><a href="${checkoutUrl}">Completar inscripción</a></p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendOnboardingEmail(email: string, firstName: string, portalUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "¡Bienvenido/a a Modo Fundraising 2026! Accede a tu portal",
    html: `
      <h2>¡Bienvenido/a ${firstName}!</h2>
      <p>Tu inscripción está confirmada. Accede a tu portal aquí:</p>
      <p><a href="${portalUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Acceder al portal</a></p>
      <p>Desde tu portal podrás:</p>
      <ul>
        <li>Ver el calendario de clases y links de acceso</li>
        <li>Acceder a las grabaciones</li>
        <li>Completar y subir tus misiones semanales</li>
        <li>Invitar a miembros de tu equipo</li>
      </ul>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendPaymentConfirmation(email: string, firstName: string, installment: number) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Pago recibido — Cuota ${installment}/3 Modo Fundraising 2026`,
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Confirmamos la recepción de tu <strong>cuota ${installment}/3</strong> para Modo Fundraising 2026.</p>
      <p>¡Gracias! Nos vemos en el programa.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendPaymentFailedEmail(email: string, firstName: string, attempt: number, portalUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Acción requerida: problema con tu pago en Modo Fundraising 2026 (aviso ${attempt}/3)`,
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Tuvimos un problema al procesar tu pago de la cuota mensual de Modo Fundraising 2026.</p>
      <p>Por favor actualiza tu método de pago:</p>
      <p><a href="${portalUrl}/suscripcion">Actualizar método de pago</a></p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendChurnEmail(email: string, firstName: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Tu suscripción a Modo Fundraising 2026 ha sido cancelada",
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Tu suscripción a Modo Fundraising 2026 ha sido cancelada y tu acceso al portal ha sido revocado.</p>
      <p>¿Nos puedes contar por qué decidiste salir? <a href="${process.env.NEXT_PUBLIC_APP_URL}/encuesta-churn">Completa esta breve encuesta</a></p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}

export async function sendCouponLink(email: string, firstName: string, checkoutUrl: string, discountPercent: number) {
  const isFullScholarship = discountPercent === 100;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: isFullScholarship
      ? "🎓 Beca completa para Modo Fundraising 2026"
      : `🎁 ${discountPercent}% de descuento para Modo Fundraising 2026`,
    html: `
      <h2>Hola ${firstName},</h2>
      <p>Tienes un <strong>${discountPercent}% de descuento</strong> reservado para Modo Fundraising 2026.</p>
      <p>Usa este enlace para inscribirte con tu beneficio aplicado:</p>
      <p><a href="${checkoutUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">${isFullScholarship ? "Activar beca" : "Inscribirme con descuento"}</a></p>
      <p>Este enlace es personal e intransferible.</p>
      <br/><p>— Equipo Impacta VC</p>
    `,
  });
}
