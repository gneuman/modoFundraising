import {
  updateStartupStatus,
  createPagoRecord,
  activateAllFoundersForApplication,
  getFounderEmailsByStartup,
  getCalendarEventIds,
} from "@/lib/airtable";
import { sendPaymentConfirmation } from "@/lib/email-engine";
import { addAttendeesToAllEvents } from "@/lib/calendar";

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
