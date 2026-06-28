export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getNextFounderForOnboarding, markFounderOnboardingSent } from "@/lib/airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";
import { obtenerSesion } from "@/lib/auth";

// POST /api/admin/onboarding/send-next
// Toma al PROXIMO founder con portal_access=1 y onboarding_enviado_at vacio,
// le manda el correo de onboarding y lo marca con timestamp para no remandar.
// Excluye al admin que apreta el boton para que no se mande a si mismo.
// Devuelve { ok, sent: { email, first_name }, pendientes: N } o { ok: false, done: true }.
//
// Patron: idempotente, 1 founder por request. El operador lo dispara N veces
// (manual desde script CLI o boton, o un loop con sleep entre llamadas).
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const session = await obtenerSesion();
  const adminEmail = session?.email ?? "";

  const next = await getNextFounderForOnboarding({
    excludeEmails: adminEmail ? [adminEmail] : [],
  });

  if (!next) {
    return NextResponse.json({
      ok: true,
      done: true,
      message: "No quedan founders pendientes de onboarding.",
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const portalUrl = `${appUrl}/portal`;

  try {
    await sendOnboardingEmail(next.email, next.first_name || "founder", portalUrl);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        founder: { id: next.id, email: next.email },
        pendientesAntes: next.pendientes,
      },
      { status: 500 },
    );
  }

  // Solo marcamos despues de que sendOnboardingEmail no tiro.
  await markFounderOnboardingSent(next.id);

  return NextResponse.json({
    ok: true,
    sent: { id: next.id, email: next.email, first_name: next.first_name },
    pendientesRestantes: next.pendientes - 1,
    sentBy: adminEmail,
  });
}
