import { MagicLoginForm } from "@/components/auth/magic-login-form";

export const metadata = {
  title: "Ingresar · Modo Fundraising",
  description: "Acceso al portal de alumnos",
};

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  let aviso: string | null = null;
  if (params.reenviado) {
    aviso = "Tu enlace anterior expiró, así que te enviamos uno nuevo. Revisa tu correo.";
  } else if (params.error === "expirado") {
    aviso = "Tu enlace expiró. Ingresa tu correo y te enviamos uno nuevo.";
  } else if (params.error === "invalido") {
    aviso = "Ese enlace no es válido. Ingresa tu correo para recibir uno nuevo.";
  }

  return (
    <MagicLoginForm
      titulo="Acceder al portal"
      subtitulo="Te enviaremos un enlace de acceso al correo que usaste para postular."
      placeholder="tu@startup.com"
      ctaPostular={{ label: "¿No tienes acceso?", href: "/" }}
      aviso={aviso}
    />
  );
}
