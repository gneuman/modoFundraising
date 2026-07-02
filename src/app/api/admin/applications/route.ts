export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllApplications, updateApplicationStatus, markAdmissionEmailSent, getFounderEmailsByStartup, getCalendarEventIds, getFutureCalendarEventIds, type ApplicationStatus, type PaymentStatus } from "@/lib/airtable";
import { sendAdmissionEmail, sendRejectionEmail, sendCouponLink, sendPaymentConfirmation } from "@/lib/email-engine";
import { buildCheckoutUrl } from "@/lib/checkout-url";
import { addAttendeesToAllEvents, removeAttendeeFromAllEvents } from "@/lib/calendar";
import { activatePortalForStartup } from "@/lib/inscripcion";

async function inviteStartupToCalendar(startupId: string) {
  try {
    // Solo S1 y S2 — el resto cae con el drip semanal (decision de Gabriel 2026-06-29)
    const [emails, eventIds] = await Promise.all([
      getFounderEmailsByStartup(startupId),
      getFutureCalendarEventIds(),
    ]);
    if (emails.length && eventIds.length) {
      await addAttendeesToAllEvents(eventIds, emails);
    }
  } catch (err) {
    console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
  }
}

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const apps = await getAllApplications();
  return NextResponse.json(apps);
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();
  const { recordId, status, rejection_reason, coupon_code, discount_percent, stripe_coupon_id, stripe_promotion_code_id } = body;
  if (!recordId) return NextResponse.json({ error: "Falta recordId" }, { status: 400 });

  // ── Reenviar checkout ────────────────────────────────────────────────────────
  if (body.action === "resend_checkout") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
      const checkoutUrl = await buildCheckoutUrl(recordId, app);
      const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;
      console.log(`[resend_checkout] recordId=${recordId} email=${app.email} discount=${discountPct}%`);
      if (discountPct > 0) {
        await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
      } else {
        await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
      }
      // Marca idempotencia para el webhook postulacion-admitida
      await markAdmissionEmailSent(recordId).catch((e) =>
        console.error(`[resend_checkout] mark fail recordId=${recordId}:`, e instanceof Error ? e.message : e)
      );
      return NextResponse.json({ success: true, url: checkoutUrl });
    } catch (err) {
      console.error(`[resend_checkout] error recordId=${recordId}`, err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  // ── Marcar pago manual (transferencia) ───────────────────────────────────────
  // El admin lo usa cuando entra plata por fuera de Stripe (ej: transferencia
  // bancaria a la cuenta Chile). Hace lo mismo que el webhook de Stripe pero
  // sin tocar Stripe: marca Inscrita, activa portal, manda correo de pago,
  // invita a Calendar y crea el registro de pago. El amount SIEMPRE se guarda
  // en USD (convertido desde la moneda original con el TC declarado).
  if (body.action === "mark_paid_manual") {
    try {
      const {
        cuota,            // 1 | 2 | 3 (default 3 = pago completo)
        metodo,           // string libre
        montoOriginal,    // número en moneda original
        moneda,           // "USD" | "CLP" | "MXN" | "ARS" | "Otro"
        tipoCambio,       // 1 si USD; en otra moneda, cuántas unidades = 1 USD
        nota,             // opcional, queda en stripe_invoice_id sintético
      } = body as {
        cuota?: number; metodo?: string; montoOriginal?: number;
        moneda?: string; tipoCambio?: number; nota?: string;
      };

      const c = cuota ?? 3;
      if (c < 1 || c > 4) {
        return NextResponse.json({ error: "cuota inválida (1-4)" }, { status: 400 });
      }
      if (!metodo || !moneda || !montoOriginal || montoOriginal <= 0) {
        return NextResponse.json({ error: "Faltan datos: metodo, moneda, montoOriginal" }, { status: 400 });
      }
      const tc = moneda === "USD" ? 1 : tipoCambio;
      if (!tc || tc <= 0) {
        return NextResponse.json({ error: "tipoCambio requerido cuando la moneda no es USD" }, { status: 400 });
      }

      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });

      // Idempotencia: no permitir doble-marca si ya está Inscrita
      if (app.status === "Inscrita" && (app.payment_status ?? "Pendiente") !== "Pendiente") {
        return NextResponse.json({
          error: `Ya está Inscrita con estado de pago "${app.payment_status}". Si necesitas registrar otra cuota, ajusta payment_status en Airtable primero.`,
        }, { status: 409 });
      }

      const amountUSD = Math.round((montoOriginal / tc) * 100) / 100;
      const paymentStatus = `Cuota ${c} pagada` as PaymentStatus;

      // Slug de nota para que sobreviva al string del invoice_id sintético
      const notaSlug = (nota ?? "").trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      const stripeInvoiceId = [
        "manual",
        metodo.toLowerCase().replace(/\s+/g, "-").slice(0, 30),
        moneda,
        Math.round(montoOriginal),
        `tc${tc}`,
        Date.now(),
        notaSlug,
      ].filter(Boolean).join("-");

      console.log(`[mark_paid_manual] recordId=${recordId} email=${app.email} metodo=${metodo} moneda=${moneda} monto=${montoOriginal} tc=${tc} → USD ${amountUSD} cuota=${c}`);

      await updateApplicationStatus(recordId, "Inscrita", {
        payment_status: paymentStatus,
        portal_access: true,
      });

      const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
      await activatePortalForStartup({
        airtableId: recordId,
        email: app.email,
        firstName: app.first_name,
        startupRecordId,
        amount: amountUSD,
        cuota: c,
        stripeInvoiceId,
        startup_name: app.startup_name,
        // Mismo criterio que el webhook: siempre mandar correo de primer pago
        cuotaParaCorreo: 1,
      });

      return NextResponse.json({ success: true, amountUSD, stripeInvoiceId });
    } catch (err) {
      console.error(`[mark_paid_manual] error recordId=${recordId}`, err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  // ── Asignar cupón ────────────────────────────────────────────────────────────
  if (!status && coupon_code !== undefined) {
    try {
      const { assignCouponToApplication } = await import("@/lib/airtable");
      await assignCouponToApplication(recordId, coupon_code, discount_percent ?? 0, stripe_coupon_id ?? "", stripe_promotion_code_id ?? "");

      // Si ya está admitida, regenerar y reenviar checkout con el nuevo cupón (non-blocking)
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app && app.status === "Admitida") {
        try {
          const appWithCoupon = {
            ...app,
            stripe_coupon_id: stripe_coupon_id ?? "",
            stripe_promotion_code_id: stripe_promotion_code_id ?? "",
            discount_percent: discount_percent ?? 0,
          };
          const checkoutUrl = await buildCheckoutUrl(recordId, appWithCoupon);
          const discountPct = Number(discount_percent ?? 0);
          console.log(`[coupon_assign] recordId=${recordId} email=${app.email} discount=${discountPct}% url=${checkoutUrl}`);
          if (discountPct > 0) {
            await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
          } else {
            await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
          }
        } catch (err) {
          console.error(`[coupon_assign] email error recordId=${recordId}`, err);
        }
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  if (!status) return NextResponse.json({ error: "Falta status" }, { status: 400 });

  // ── Cambio de status ─────────────────────────────────────────────────────────
  const extra: Record<string, unknown> = {};
  if (rejection_reason) extra.rejection_reason = rejection_reason;

  if (status === "Admitida") {
    // Nuevo ciclo de admisión: resetea los flags de follow-up del ciclo anterior
    // para que el cron no cierre a "Sin Respuesta" con timestamps viejos.
    // También limpia admission_email_sent_at por si el correo falla acá y hay
    // que dejarle al webhook postulacion-admitida la responsabilidad de disparar.
    extra.admitted_at = new Date().toISOString();
    extra.follow_up_1_sent = false;
    extra.follow_up_1_sent_at = null;
    extra.follow_up_2_sent = false;
    extra.follow_up_2_sent_at = null;
    extra.admission_email_sent_at = null;
  }
  await updateApplicationStatus(recordId, status as ApplicationStatus, extra);

  if (status === "Admitida") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) {
        const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;
        console.log(`[admit] recordId=${recordId} email=${app.email} discount=${discountPct}%`);
        if (discountPct === 100) {
          // Beca 100%: no hay cobro real. Marcamos payment_status propio para que
          // el campo refleje la realidad (no "Pendiente") y alimente el badge.
          await updateApplicationStatus(recordId, "Inscrita", { portal_access: true, payment_status: "Beca 100%" });
          // Mandar el correo de confirmación PRIMERO para pre-warmear Gmail
          // con `admin@impacta.vc` y evitar el warning "remitente desconocido"
          // en la invitación de Calendar que viene a continuación.
          if (app.email && app.first_name) {
            await sendPaymentConfirmation(app.email, app.first_name, 1);
          }
          const startupId = (app.startup_record as string[] | undefined)?.[0];
          if (startupId) await inviteStartupToCalendar(startupId);
          return NextResponse.json({ success: true, inscrita_directa: true });
        }
        const checkoutUrl = await buildCheckoutUrl(recordId, app);
        console.log(`[admit] checkoutUrl=${checkoutUrl}`);
        if (discountPct > 0) {
          await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
        } else {
          await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
        }
        // Marca idempotencia — evita que el webhook postulacion-admitida re-dispare.
        await markAdmissionEmailSent(recordId).catch((e) =>
          console.error(`[admit] mark fail recordId=${recordId}:`, e instanceof Error ? e.message : e)
        );
      } else {
        console.error(`[admit] app not found for recordId=${recordId}`);
      }
    } catch (err) {
      console.error(`[admit] email error recordId=${recordId}`, err);
    }
  }

  if (status === "Rechazada") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) {
        console.log(`[reject] recordId=${recordId} email=${app.email}`);
        await sendRejectionEmail(app.email!, app.first_name!);
      }
    } catch (err) {
      console.error(`[reject] email error recordId=${recordId}`, err);
    }
  }

  if (status === "Churn" || status === "Churn By Founder") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      const startupId = (app?.startup_record as string[] | undefined)?.[0];
      if (startupId) {
        const [founderEmails, eventIds] = await Promise.all([
          getFounderEmailsByStartup(startupId),
          getCalendarEventIds(),
        ]);
        if (founderEmails.length && eventIds.length) {
          await Promise.allSettled(
            founderEmails.map((email) => removeAttendeeFromAllEvents(eventIds, email))
          );
        }
      }
    } catch (err) {
      console.error("Calendar remove error:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ success: true });
}
