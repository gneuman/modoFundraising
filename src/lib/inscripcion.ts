import {
  updateStartupStatus,
  createPagoRecord,
  activateAllFoundersForApplication,
  getFounderEmailsByStartup,
  getFoundersForOnboardingByStartup,
  markFounderOnboardingSent,
  getCalendarEventIds,
} from "@/lib/airtable";
import { sendPaymentConfirmation, sendOnboardingEmail } from "@/lib/email-engine";
import { addAttendeesToAllEvents } from "@/lib/calendar";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;

// Activa el portal para todos los founders de una postulación, manda el correo
// de confirmación de pago, invita a Calendar y registra el pago en Airtable.
// Usado por el webhook de Stripe y por la acción admin de "marcar pago manual".
//
// Orden importante (commit 9b562e8): el correo de pago va ANTES que la invitación
// de Calendar para pre-warmear Gmail con `admin@impacta.vc` y evitar el warning
// "Invitación de un remitente desconocido".
export async function activatePortalForStartup(opts: {
  airtableId: string;
  email?: string;
  firstName?: string;
  stripeCustomerId?: string;
  startupRecordId?: string;
  amount: number;
  cuota: number;
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  startup_name?: string;
  // Cuota a usar SOLO para el correo. Para pago completo (cuota=3) sigue mandando
  // el correo de "primer pago" (pago_cuota_1) y nada más.
  cuotaParaCorreo?: number;
}) {
  const {
    airtableId, email, firstName, stripeCustomerId, startupRecordId,
    amount, cuota, stripeInvoiceId, stripeSubscriptionId, startup_name,
    cuotaParaCorreo,
  } = opts;

  await activateAllFoundersForApplication(airtableId, stripeCustomerId);

  if (startupRecordId) await updateStartupStatus(startupRecordId, "Inscrita");

  if (email && firstName) {
    await sendPaymentConfirmation(email, firstName, cuotaParaCorreo ?? cuota);
  }

  if (startupRecordId) {
    try {
      const [emails, eventIds] = await Promise.all([
        getFounderEmailsByStartup(startupRecordId),
        getCalendarEventIds(),
      ]);
      if (emails.length && eventIds.length) {
        await addAttendeesToAllEvents(eventIds, emails);
      }
    } catch (err) {
      console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
    }

    // Onboarding: solo a founders que aun no lo recibieron (idempotente).
    // No bloqueante: si falla el correo de uno, seguimos con el resto.
    try {
      const founders = await getFoundersForOnboardingByStartup(startupRecordId);
      for (const f of founders) {
        try {
          await sendOnboardingEmail(f.email, f.first_name || "founder", PORTAL_URL);
          await markFounderOnboardingSent(f.id);
        } catch (err) {
          console.error("Onboarding email error (non-blocking) for", f.email, ":", err instanceof Error ? err.message : err);
        }
      }
    } catch (err) {
      console.error("Onboarding fan-out error (non-blocking):", err instanceof Error ? err.message : err);
    }
  }

  if (startupRecordId && email) {
    await createPagoRecord({
      postulacionId: airtableId,
      startupRecordId,
      email,
      startup_name: startup_name ?? "",
      cuota,
      amount,
      stripe_invoice_id: stripeInvoiceId,
      stripe_subscription_id: stripeSubscriptionId,
    });
  }
}
