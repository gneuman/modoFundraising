import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERRORES: Record<string, string> = {
  not_found: "No encontramos una cuenta con ese email. ¿Ya postulaste?",
  invalido: "El link es inválido.",
  expirado: "El link expiró. Pedí uno nuevo.",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const mensajeError = error ? (ERRORES[error] ?? "Error al ingresar.") : null;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #181b2f 0%, #1a0d2e 50%, #181b2f 100%)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={180} height={54} className="object-contain" />
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-sm p-8">
          <h1 className="text-xl font-bold text-white mb-2">Acceder al portal</h1>
          <p className="text-sm text-white/40 mb-6">Ingresá con el email que usaste para postular.</p>

          <form method="POST" action="/api/auth/login" className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder="tu@startup.com"
              required
              autoFocus
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30"
            />

            {mensajeError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {mensajeError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full text-white"
              style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)" }}
            >
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30">
          ¿No tenés acceso?{" "}
          <a href="/apply" className="text-white/50 hover:text-white underline transition-colors">
            Postulá al programa
          </a>
        </p>
      </div>
    </main>
  );
}
