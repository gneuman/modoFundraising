"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChatForm } from "@/components/apply/chat-form";

const STORAGE_KEY = "mf2026_chat";
const SUBMITTED_KEY = "mf2026_submitted";

export default function ApplyByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await fetch(`/api/apply/load/${id}`);
        if (!res.ok) {
          setError("No encontramos esa postulación.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        // Limpiar marker de "ya enviada" para que renderice el chat
        localStorage.removeItem(SUBMITTED_KEY);
        // Saltar a la primera pregunta vacía (no respondida) usando el orden
        // de QUESTIONS en chat-form. Importado dinámicamente para evitar el SSR.
        const mod = await import("@/components/apply/chat-form");
        const QUESTIONS = (mod as { QUESTIONS?: { id: string; condition?: (d: Record<string, unknown>) => boolean }[] }).QUESTIONS ?? [];
        let firstEmpty = 0;
        for (let i = 0; i < QUESTIONS.length; i++) {
          const q = QUESTIONS[i];
          if (q.condition && !q.condition(data.formData)) continue;
          const val = data.formData[q.id];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            firstEmpty = i;
            break;
          }
          firstEmpty = i + 1;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData: data.formData, qIdx: firstEmpty }));
        setLoading(false);
      } catch (e) {
        console.error("[apply/[id]] load error:", e);
        setError("Error cargando la postulación.");
        setLoading(false);
      }
    }
    loadDraft();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <p className="text-white/70 text-sm">Cargando tu postulación...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-white text-lg">{error}</p>
          <button onClick={() => router.push("/")} className="text-blue-300 underline text-sm">
            Empezar una nueva postulación
          </button>
        </div>
      </main>
    );
  }

  return <ChatForm onSuccess={() => router.push("/apply/success")} />;
}
