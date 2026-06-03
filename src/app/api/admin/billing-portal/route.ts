export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { findFailedSubByEmail, createBillingPortalLink } from "@/lib/stripe";
import { getAllApplications } from "@/lib/airtable";

/**
 * POST /api/admin/billing-portal
 *
 * Para founders cuya suscripción (creada a mano en Stripe) quedó con la tarjeta
 * fallida. Busca su customer por email, detecta la suscripción past_due/unpaid/
 * incomplete y (opcionalmente) genera un link al Billing Portal de Stripe. Al
 * actualizar la tarjeta ahí, Stripe reintenta automáticamente la factura
 * pendiente.
 *
 * Body:
 *   {
 *     scanAll?:  boolean,    // true = revisa TODOS los inscritos de Airtable vs Stripe (solo diagnóstico)
 *     emails?:   string[],   // emails directos
 *     startups?: string[],   // nombres de startup (se resuelven a email vía Airtable)
 *     diagnose?: boolean      // true = solo diagnóstico, NO genera links
 *   }
 *
 * Respuesta: { count, con_fallo, con_fallo_inputs, results: Array<{ input, email, ...info, portalUrl }> }
 *
 * Solo admin (verificarAdmin).
 */
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const emails: string[] = Array.isArray(body?.emails) ? body.emails.map(String) : [];
  const startups: string[] = Array.isArray(body?.startups) ? body.startups.map(String) : [];
  const diagnose: boolean = body?.diagnose === true;
  // scanAll = revisa TODOS los inscritos en Airtable contra Stripe.
  const scanAll: boolean = body?.scanAll === true;

  if (!scanAll && emails.length === 0 && startups.length === 0) {
    return NextResponse.json(
      { error: "Envía { scanAll: true } o { emails: [] } y/o { startups: [] }" },
      { status: 400 }
    );
  }

  // Cargamos Airtable si vamos a resolver startups o a escanear todo.
  const apps = scanAll || startups.length > 0 ? await getAllApplications() : [];
  const norm = (s: string) => s.trim().toLowerCase();

  // Lista de entradas: cada una con el input original (para que sepas qué pediste)
  // y el email resuelto (o null si no se encontró).
  const inputs: { input: string; email: string | null }[] = [];

  if (scanAll) {
    // Todos los inscritos con email — el cruce real lo hace Stripe.
    for (const a of apps) {
      if (a.status === "Inscrita" && a.email) {
        inputs.push({ input: a.startup_name ?? a.email, email: norm(a.email) });
      }
    }
  }
  for (const e of emails) {
    inputs.push({ input: e, email: norm(e) || null });
  }
  for (const name of startups) {
    const match = apps.find((a) => a.startup_name && norm(a.startup_name) === norm(name));
    inputs.push({ input: name, email: match?.email ? norm(match.email) : null });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const returnUrl = `${appUrl}/portal`;

  // scanAll siempre es diagnóstico: no generamos links para todos a ciegas.
  const onlyDiagnose = diagnose || scanAll;

  const results = [];

  for (const { input, email } of inputs) {
    if (!email) {
      results.push({
        input,
        email: null,
        customerId: null,
        subscriptionId: null,
        subStatus: null,
        openInvoiceId: null,
        amountDue: null,
        portalUrl: null,
        note: "No se encontró email para este input (startup no está en Airtable o nombre no coincide)",
      });
      continue;
    }

    try {
      const info = await findFailedSubByEmail(email);

      let portalUrl: string | null = null;
      // En modo diagnose/scanAll NO generamos links — solo reportamos estado.
      if (!onlyDiagnose && info.customerId) {
        portalUrl = await createBillingPortalLink(info.customerId, returnUrl);
      }

      results.push({ input, ...info, portalUrl });
    } catch (err) {
      results.push({
        input,
        email,
        customerId: null,
        subscriptionId: null,
        subStatus: null,
        openInvoiceId: null,
        amountDue: null,
        portalUrl: null,
        note: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Los que requieren acción: tienen una sub en estado problemático.
  const PROBLEM = ["past_due", "unpaid", "incomplete"];
  const conFallo = results.filter((r) => r.subStatus && PROBLEM.includes(r.subStatus));

  return NextResponse.json({
    count: results.length,
    scanAll,
    diagnose: onlyDiagnose,
    con_fallo: conFallo.length,
    con_fallo_inputs: conFallo.map((r) => r.input),
    results,
  });
}
