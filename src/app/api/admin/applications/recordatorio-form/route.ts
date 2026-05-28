export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllApplications } from "@/lib/airtable";
import { sendFormAbandonado } from "@/lib/email-engine";

// POST /api/admin/applications/recordatorio-form
// Envía recordatorio a postulaciones que no completaron el form (sin accept_legal_terms).
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const apps = await getAllApplications();
  const incompletas = apps.filter((a) => !a.accept_legal_terms && a.email && a.first_name);

  if (incompletas.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const results = await Promise.allSettled(
    incompletas.map((app) => sendFormAbandonado(app.email!, app.first_name!, app.id!))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "Error");

  return NextResponse.json({ sent, total: incompletas.length, errors });
}
