export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { stripe } from "@/lib/stripe";

// Reembolsa todos los charges succeeded de un email con saldo pendiente.
// Se usa desde /admin/churn para founders dentro de ventana 14 dias.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const refunded: Array<{ chargeId: string; amount: number }> = [];
  const errors: Array<{ chargeId: string; error: string }> = [];

  for await (const c of stripe.charges.list({ limit: 100 })) {
    if (c.status !== "succeeded") continue;
    const chargeEmail = (c.billing_details?.email ?? c.receipt_email ?? "").toLowerCase();
    if (chargeEmail !== email) continue;
    const pending = (c.amount ?? 0) - (c.amount_refunded ?? 0);
    if (pending <= 0) continue;

    try {
      const r = await stripe.refunds.create({
        charge: c.id,
        amount: pending,
        reason: "requested_by_customer",
      });
      refunded.push({ chargeId: c.id, amount: (r.amount ?? 0) / 100 });
    } catch (err) {
      errors.push({
        chargeId: c.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalRefunded = refunded.reduce((s, r) => s + r.amount, 0);
  return NextResponse.json({
    success: errors.length === 0,
    email,
    refunded,
    totalRefunded,
    errors,
  });
}
