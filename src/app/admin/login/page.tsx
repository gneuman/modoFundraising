import { MagicLoginForm } from "@/components/auth/magic-login-form";

export const metadata = {
  title: "Admin · Modo Fundraising",
  description: "Acceso administrativo",
};

export default function AdminLoginPage() {
  return (
    <MagicLoginForm
      titulo="Acceso administrativo"
      subtitulo="Solo para el equipo de Impacta. Te enviaremos un enlace al correo."
      placeholder="tu@impacta.vc"
      ctaLabel="Enviar enlace de admin"
      ctaPostular={null}
    />
  );
}
