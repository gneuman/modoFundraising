import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, updateApplicationStatus, type ApplicationStatus } from "@/lib/airtable";
import { sendAdmissionEmail, sendRejectionEmail } from "@/lib/resend";
import { createCheckoutToken } from "@/lib/checkout-token";

export async function GET() {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apps = await getAllApplications();
  return NextResponse.json(apps);
}

export async function PATCH(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recordId, status, rejection_reason, coupon_code, discount_percent, stripe_coupon_id } = body;
  if (!recordId) {
    return NextResponse.json({ error: "Falta recordId" }, { status: 400 });
  }

  // Resend checkout link
  if (body.action === "resend_checkout") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
      const token = await createCheckoutToken({
        airtableId: recordId,
        email: app.email!,
        firstName: app.first_name!,
        startupName: app.startup_name!,
        stripeCouponId: app.stripe_coupon_id as string | undefined,
        discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
      });
      const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${token}`;
      return NextResponse.json({ url: checkoutUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Coupon assignment (no status change)
  if (!status && coupon_code !== undefined) {
    try {
      const { assignCouponToApplication } = await import("@/lib/airtable");
      await assignCouponToApplication(recordId, coupon_code, discount_percent ?? 0, stripe_coupon_id ?? "");
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Coupon assignment error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (!status) {
    return NextResponse.json({ error: "Falta status" }, { status: 400 });
  }

  const extra: Record<string, unknown> = {};
  if (rejection_reason) extra.rejection_reason = rejection_reason;

  await updateApplicationStatus(recordId, status as ApplicationStatus, extra);

  if (status === "Admitida") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) {
        // Generate a signed checkout token (7 days) with coupon info embedded
        const token = await createCheckoutToken({
          airtableId: recordId,
          email: app.email!,
          firstName: app.first_name!,
          startupName: app.startup_name!,
          stripeCouponId: app.stripe_coupon_id as string | undefined,
          discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
        });

        const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${token}`;
        await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
      }
    } catch (err) {
      console.error("Admission email error:", err);
    }
  }

  if (status === "Rechazada") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) await sendRejectionEmail(app.email!, app.first_name!);
    } catch (err) {
      console.error("Rejection email error:", err);
    }
  }

  return NextResponse.json({ success: true });
}
