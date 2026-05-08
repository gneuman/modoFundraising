import { CheckCircle2 } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  precio: "💸 El precio no se ajusta a mi presupuesto actual",
  tiempo: "⏰ No tengo el tiempo que requiere el programa",
  prioridades: "🎯 Mis prioridades cambiaron y el fundraising no es el foco ahora",
  ronda_cerrada: "✅ Ya levanté mi ronda",
  expectativas: "🤔 El programa no era lo que esperaba",
  otro: "Otro motivo",
};

interface PageProps {
  searchParams: Promise<{ id?: string; reason?: string; saved?: string }>;
}

export default async function UnsubscribeFeedbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { reason, saved } = params;

  const reasonLabel = reason ? REASON_LABELS[reason] : null;
  const alreadySaved = saved === "1";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>

        <h1 className="text-xl font-bold text-zinc-900 mb-3">
          {alreadySaved ? "¡Gracias por tu feedback!" : "Confirmación recibida"}
        </h1>

        {alreadySaved && reasonLabel && (
          <p className="text-sm text-zinc-500 mb-4">
            Registramos tu respuesta:<br />
            <span className="font-medium text-zinc-700">{reasonLabel}</span>
          </p>
        )}

        <p className="text-sm text-zinc-500">
          Lamentamos verte partir. Esperamos que los caminos se vuelvan a cruzar en
          alguna de nuestras próximas iniciativas.
        </p>

        <a
          href="https://impacta.vc"
          className="mt-8 inline-block text-sm text-blue-600 font-medium hover:underline"
        >
          Volver a Impacta VC →
        </a>
      </div>
    </div>
  );
}
