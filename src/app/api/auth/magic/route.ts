import { NextRequest, NextResponse } from "next/server";
import { crearTokenMagic, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalizado = email.trim().toLowerCase();
  const rol = esAdmin(normalizado) ? "admin" : "founder";

  // Si no es admin, debe existir como founder en Airtable
  if (rol === "founder") {
    const founder = await getFounderByEmail(normalizado);
    if (!founder) {
      return NextResponse.json(
        { error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" },
        { status: 404 }
      );
    }
  }

  const token = await crearTokenMagic(normalizado);

  const { sendMagicLink } = await import("@/lib/email-engine");
  await sendMagicLink(normalizado, token, rol);

  return NextResponse.json({ success: true, message: "Te enviamos un enlace al correo." });
}
