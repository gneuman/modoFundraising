import Link from "next/link";
import Image from "next/image";

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={180} height={54} className="object-contain" />
        </div>
        <div className="text-6xl">🚀</div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">¡Postulación enviada!</h1>
          <p className="text-blue-200 text-base">
            Gracias por postular a Modo Fundraising 2026. Nuestro equipo revisará tu aplicación y te contactaremos por email en los próximos días con los pasos a seguir.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-blue-300 text-sm">Síguenos para estar al tanto de novedades:</p>
          <div className="flex justify-center gap-4">
            <a href="https://www.linkedin.com/company/impacta-vc" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
              LinkedIn
            </a>
            <a href="https://www.instagram.com/impacta.vc" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
              Instagram
            </a>
          </div>
        </div>
        <Link href="https://impacta.vc"
          className="inline-block text-blue-400 hover:text-blue-300 text-sm underline transition-colors">
          Volver a impacta.vc
        </Link>
      </div>
    </main>
  );
}
