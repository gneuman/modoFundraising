"use server";

import { redirect } from "next/navigation";
import { crearSesion, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) return { error: "Email requerido" };

  if (esAdmin(email)) {
    await crearSesion({ email, role: "admin" });
    redirect("/admin/dashboard");
  }

  const founder = await getFounderByEmail(email);
  if (!founder) {
    return { error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" };
  }

  await crearSesion({ email, role: "founder" });
  redirect("/portal");
}
