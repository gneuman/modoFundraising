import { MagicLoginForm } from "@/components/auth/magic-login-form";

export const metadata = {
  title: "Ingresar · Modo Fundraising",
  description: "Acceso al portal de alumnos",
};

export default function IngresarPage() {
  return (
    <MagicLoginForm
      titulo="Acceder al portal"
      subtitulo="Te enviaremos un enlace de acceso al correo que usaste para postular."
      placeholder="tu@startup.com"
      ctaPostular={{ label: "¿No tienes acceso?", href: "/" }}
    />
  );
}
