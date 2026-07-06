export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";

// Define el número total de cuotas de una suscripción desde el panel
// /admin/suscripciones. Resuelve el bug de total_cuotas vacío (WI-1844):
// vacío = el sistema asume 3, cancelando los planes de 4 una cuota antes.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const postulacionId =
    typeof body?.postulacionId === "string" ? body.postulacionId : "";
  const totalCuotas = Number(body?.totalCuotas);

  if (!postulacionId) {
    return NextResponse.json({ error: "postulacionId requerido" }, { status: 400 });
  }
  if (![1, 3, 4].includes(totalCuotas)) {
    return NextResponse.json(
      { error: "total_cuotas debe ser 1, 3 o 4" },
      { status: 400 },
    );
  }

  const apps = await getAllApplications();
  const app = apps.find((a) => a.id === postulacionId);
  if (!app) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }

  // updateApplicationStatus exige un status; conservar el actual para no pisarlo.
  await updateApplicationStatus(postulacionId, app.status ?? "Inscrita", {
    total_cuotas: totalCuotas,
  });

  return NextResponse.json({ success: true, postulacionId, totalCuotas });
}
