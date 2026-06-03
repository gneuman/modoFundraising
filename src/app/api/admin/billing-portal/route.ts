export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { findFailedSubByEmail, createBillingPortalLink } from "@/lib/stripe";
import { getAllApplications } from "@/lib/airtable";

/**
 * /api/admin/billing-portal
 *
 * Para founders cuya suscripción (creada a mano en Stripe) quedó con la tarjeta
 * fallida. Busca su customer por email, detecta la suscripción past_due/unpaid/
 * incomplete y (opcionalmente) genera un link al Billing Portal de Stripe. Al
 * actualizar la tarjeta ahí, Stripe reintenta automáticamente la factura.
 *
 * AUTH: cookie admin (verificarAdmin) O  ?key=<BILLING_KEY> en la URL.
 *
 * GET  ?key=...&scanAll=1                 → revisa TODOS los inscritos (diagnóstico)
 * GET  ?key=...&emails=a@x.com,b@y.com    → genera links para esos emails
 * GET  ?key=...&startups=Maity,Antü       → resuelve por nombre y genera links
 * GET  ?key=...&diagnose=1&...            → fuerza solo diagnóstico
 *
 * POST { scanAll? , emails?[] , startups?[] , diagnose? }  (mismo comportamiento)
 */

// Token alterno para llamar sin cookie admin. Usa su propia env var BILLING_KEY.
function tokenOk(req: NextRequest): boolean {
  const secret = process.env.BILLING_KEY ?? "";
  if (!secret) return false;
  return (req.nextUrl.searchParams.get("key") ?? "") === secret;
}

type Opts = {
  scanAll: boolean;
  emails: string[];
  startups: string[];
  diagnose: boolean;
};

const EMPTY = {
  customerId: null,
  subscriptionId: null,
  subStatus: null,
  openInvoiceId: null,
  amountDue: null,
  portalUrl: null,
};

async function run({ scanAll, emails, startups, diagnose }: Opts) {
  if (!scanAll && emails.length === 0 && startups.length === 0) {
    return NextResponse.json(
      { error: "Envía scanAll, emails o startups" },
      { status: 400 }
    );
  }

  const apps = scanAll || startups.length > 0 ? await getAllApplications() : [];
  const norm = (s: string) => s.trim().toLowerCase();

  const inputs: { input: string; email: string | null }[] = [];

  if (scanAll) {
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
        ...EMPTY,
        note: "No se encontró email (startup no está en Airtable o nombre no coincide)",
      });
      continue;
    }

    try {
      const info = await findFailedSubByEmail(email);
      let portalUrl: string | null = null;
      if (!onlyDiagnose && info.customerId) {
        portalUrl = await createBillingPortalLink(info.customerId, returnUrl);
      }
      results.push({ input, ...info, portalUrl });
    } catch (err) {
      results.push({
        input,
        email,
        ...EMPTY,
        note: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

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

const truthy = (v: string | null) => v === "1" || v === "true";
const csv = (v: string | null) =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) {
    const denied = await verificarAdmin(req);
    if (denied) return denied;
  }
  const p = req.nextUrl.searchParams;
  return run({
    scanAll: truthy(p.get("scanAll")),
    emails: csv(p.get("emails")),
    startups: csv(p.get("startups")),
    diagnose: truthy(p.get("diagnose")),
  });
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) {
    const denied = await verificarAdmin(req);
    if (denied) return denied;
  }
  const body = await req.json().catch(() => ({}));
  return run({
    scanAll: body?.scanAll === true,
    emails: Array.isArray(body?.emails) ? body.emails.map(String) : [],
    startups: Array.isArray(body?.startups) ? body.startups.map(String) : [],
    diagnose: body?.diagnose === true,
  });
}
