"use server";

import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";

export async function guardarMotivoChurn(motivo: string, detalle?: string) {
  const session = await obtenerSesion();
  if (!session) return { error: "No autorizado" };

  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session.email);
  if (!app?.id) return { error: "Postulación no encontrada" };

  const churn_reason = detalle ? `${motivo}: ${detalle}` : motivo;
  await updateApplicationStatus(app.id, "Churn By Founder", { churn_reason });

  return { success: true };
}
