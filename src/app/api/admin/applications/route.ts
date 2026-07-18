export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllApplications, updateApplicationStatus, markAdmissionEmailSent, getFounderEmailsByStartup, getCalendarEventIds, getFutureCalendarEventIds, deactivateAllFoundersForApplication, activateAllFoundersForApplication, updateStartupStatus, getFoundersForOnboardingByStartup, markFounderOnboardingSent, statusOtorgaAcceso, type ApplicationStatus, type PaymentStatus } from "@/lib/airtable";
import { sendAdmissionEmail, sendRejectionEmail, sendCouponLink, sendOnboardingEmail } from "@/lib/email-engine";
import { buildCheckoutUrl } from "@/lib/checkout-url";
import { addAttendeesToAllEvents, removeAttendeesFromAllEvents } from "@/lib/calendar";
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

// Manda el correo de onboarding (acceso al portal) a los founders de la startup
// que aun no lo recibieron. Serial + idempotente (marca onboarding_enviado_at),
// mismo patron que inscripcion.ts. Non-blocking: si falla uno, sigue con el resto.
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
async function sendOnboardingForStartup(startupId: string) {
  try {
    const founders = await getFoundersForOnboardingByStartup(startupId);
    for (const f of founders) {
      try {
        await sendOnboardingEmail(f.email, f.first_name || "founder", `${APP_URL}/portal`);
        await markFounderOnboardingSent(f.id);
      } catch (err) {
        console.error("[onboarding] error for", f.email, ":", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("[onboarding] fan-out error (non-blocking):", err instanceof Error ? err.message : err);
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

  // ── Reactivar sin cobro (dados de baja) ──────────────────────────────────────
  // El admin reactiva a un founder dado de baja (Churn / Churn By Founder) para
  // que recupere acceso al portal AUNQUE no haya pagado todavía. NO toca Stripe:
  // no crea checkout ni suscripción, así que NO puede generar un cobro duplicado.
  // El cobro pendiente lo regulariza el founder por su cuenta (billing portal o
  // checkout desde /admin/recuperar-pagos, que diagnostica el estado real de la
  // sub). Al pagar, el webhook lo procesa normal y vuelve al flujo (misiones,
  // asistencia, pagos). Lo dejamos en "Admitida": otorga acceso (banner de pago
  // pendiente) y el cron de cobranza lo IGNORA (solo procesa "Inscrita"), así que
  // el payment_failed_at viejo no lo re-suspende. Igual limpiamos los sensores de
  // cobranza para que, si mañana algo lo vuelve a "Inscrita", el cron arranque limpio.
  if (body.action === "reactivate_no_charge") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });

      // Solo aplica a dados de baja. Evita usarlo por error sobre una activa.
      if (app.status !== "Churn" && app.status !== "Churn By Founder") {
        return NextResponse.json({
          error: `Solo se puede reactivar sin cobro a una postulación dada de baja (Churn). Estado actual: "${app.status}".`,
        }, { status: 409 });
      }
      // Idempotencia: si ya tiene acceso, no hacer nada.
      if (statusOtorgaAcceso(app.status)) {
        return NextResponse.json({ error: "La postulación ya tiene acceso." }, { status: 409 });
      }

      const nota = typeof body.nota === "string" ? body.nota.trim() : "";
      console.log(`[reactivate_no_charge] recordId=${recordId} email=${app.email} statusPrevio=${app.status} nota="${nota}"`);

      // Airtable: status "Admitida" + portal_access + limpiar sensores de cobranza.
      // NO tocamos Stripe. churn_reason deja rastro de la reactivación manual.
      await updateApplicationStatus(recordId, "Admitida", {
        portal_access: true,
        payment_failed_at: null,
        payment_resolved_at: null,
        payment_reminder_1_at: null,
        payment_reminder_2_at: null,
        payment_reminder_3_at: null,
        churn_reason: `Reactivado sin cobro ${new Date().toISOString().slice(0, 10)}${nota ? ` — ${nota}` : ""}`,
      } as never);

      // Reactivar acceso con helpers granulares (NO activatePortalForStartup, que
      // mandaría el correo de "pago recibido" — sería falso, no pagó). Esto pone
      // portal_access=true en todos los founders, reactiva la startup y reinvita
      // a S1/S2 en calendar.
      await activateAllFoundersForApplication(recordId).catch((err) =>
        console.error("[reactivate_no_charge] activate founders error:", err instanceof Error ? err.message : err)
      );
      const startupId = (app.startup_record as string[] | undefined)?.[0];
      if (startupId) {
        await updateStartupStatus(startupId, "Inscrita").catch((err) =>
          console.error("[reactivate_no_charge] update startup error:", err instanceof Error ? err.message : err)
        );
        await inviteStartupToCalendar(startupId);
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error(`[reactivate_no_charge] error recordId=${recordId}`, err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  // ── Corregir acceso inconsistente (OP-2167) ──────────────────────────────────
  // Para startups Inscrita/pagada/Beca cuyos founders quedaron sin portal_access
  // (caso Ciudata: doble-sub → churn erróneo; o becados sin activar). Reactiva
  // acceso SIN cambiar el status (ya está Inscrita) y sin tocar Stripe. Idempotente.
  if (body.action === "fix_access") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });

      // Solo corregir a quien DEBERÍA tener acceso (status en el allowlist). No
      // reactivar churn/rechazos por error.
      if (!statusOtorgaAcceso(app.status ?? "")) {
        return NextResponse.json({
          error: `El status "${app.status}" no otorga acceso. Usa "Reactivar sin cobro" si querés reingresarlo.`,
        }, { status: 409 });
      }

      console.log(`[fix_access] recordId=${recordId} email=${app.email} status=${app.status}`);

      await activateAllFoundersForApplication(recordId).catch((err) =>
        console.error("[fix_access] activate founders error:", err instanceof Error ? err.message : err)
      );
      await updateApplicationStatus(recordId, app.status as ApplicationStatus, { portal_access: true });
      const startupId = (app.startup_record as string[] | undefined)?.[0];
      if (startupId) {
        await updateStartupStatus(startupId, "Inscrita").catch((err) =>
          console.error("[fix_access] update startup error:", err instanceof Error ? err.message : err)
        );
        await inviteStartupToCalendar(startupId);
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error(`[fix_access] error recordId=${recordId}`, err);
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
          // Activar portal_access en TODOS los founders. Sin esto, el founder no
          // puede entrar al portal (el gate se rige por portal_access del Founder)
          // y getFoundersForOnboardingByStartup los ignora → no llega onboarding.
          await activateAllFoundersForApplication(recordId).catch((err) =>
            console.error("[admit beca] activate founders error:", err instanceof Error ? err.message : err)
          );
          const startupId = (app.startup_record as string[] | undefined)?.[0];
          if (startupId) {
            await updateStartupStatus(startupId, "Inscrita").catch((err) =>
              console.error("[admit beca] update startup error:", err instanceof Error ? err.message : err)
            );
            // Invitar a Calendar (S1/S2) ANTES del onboarding para pre-warmear Gmail.
            await inviteStartupToCalendar(startupId);
            // Onboarding: el correo con el acceso al portal. Es el que faltaba —
            // la beca solo mandaba el de "pago recibido" (desactualizado y sin link).
            await sendOnboardingForStartup(startupId);
          }
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

  // Guardrail uniforme (OP-1939): si el nuevo status NO otorga acceso al programa
  // —Churn, Churn By Founder, Rechazada, Rechazada por founder, Money Back, Sin
  // Respuesta, o cualquier valor futuro fuera del allowlist— hay que apagar el
  // acceso en origen: desactivar portal_access de TODOS los founders de la
  // postulación Y sacarlos del calendario. Así el flag nunca queda sucio y el
  // reconciliador no tiene que limpiar basura. Antes solo Churn sacaba del
  // calendario (y ni siquiera desactivaba portal_access); Rechazada/Money Back no
  // hacían nada → invitaciones fantasma.
  if (!statusOtorgaAcceso(status)) {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      const startupId = (app?.startup_record as string[] | undefined)?.[0];

      // Emails ANTES de desactivar (getFounderEmailsByStartup filtra portal_access=1).
      const founderEmails = startupId
        ? await getFounderEmailsByStartup(startupId).catch(() => [] as string[])
        : [];

      await deactivateAllFoundersForApplication(recordId).catch((err) =>
        console.error("Deactivate founders error:", err instanceof Error ? err.message : err)
      );

      if (founderEmails.length) {
        const eventIds = await getCalendarEventIds();
        if (eventIds.length) {
          await removeAttendeesFromAllEvents(eventIds, founderEmails);
        }
      }
    } catch (err) {
      console.error("Guardrail salida (deactivate+calendar) error:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ success: true });
}
