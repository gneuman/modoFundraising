"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ApplicationForm } from "@/components/apply/application-form";

export default function ApplyPage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="flex justify-center">
            <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={200} height={60} className="object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              ¿Listo para dominar las skills que te llevan a levantar tu próxima ronda?
            </h1>
            <p className="text-blue-200 text-lg">
              Estás a un paso de sumarte a la red de <strong>+400 startups LatAm</strong> que ya han levantado <strong>+US$180M</strong>.
            </p>
            <p className="text-blue-300 text-base mt-2">
              Completa tu postulación a <strong>Modo Fundraising 2026</strong> — 5ta edición. Te toma 10 minutos.
            </p>
          </div>
          <button
            onClick={() => setStarted(true)}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-colors shadow-lg"
          >
            Comenzar postulación →
          </button>
          <p className="text-blue-400 text-sm">
            ¿Ya empezaste? Tu progreso está guardado automáticamente.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-8">
          <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={160} height={48} className="object-contain" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <ApplicationForm onSuccess={() => router.push("/apply/success")} />
        </div>
      </div>
    </main>
  );
}
