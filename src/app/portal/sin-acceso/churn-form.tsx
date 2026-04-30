"use client";

import { useState, useTransition } from "react";
import { guardarMotivoChurn } from "./actions";

const MOTIVOS = [
  "El precio no se ajusta a mi presupuesto",
  "El programa no era lo que esperaba",
  "Falta de tiempo para participar",
  "Ya conseguí lo que necesitaba",
  "Problemas técnicos con la plataforma",
  "Otro",
];

export function ChurnForm() {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) return;
    startTransition(async () => {
      await guardarMotivoChurn(motivo, detalle || undefined);
      setEnviado(true);
    });
  }

  if (enviado) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-600 text-center">
        Gracias por tu feedback. Nos ayuda a mejorar el programa.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 text-left">
      <p className="text-sm font-medium text-zinc-700">¿Por qué cancelaste? (opcional)</p>

      <div className="space-y-2">
        {MOTIVOS.map((m) => (
          <label key={m} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="motivo"
              value={m}
              checked={motivo === m}
              onChange={() => setMotivo(m)}
              className="accent-blue-600"
            />
            <span className="text-sm text-zinc-600">{m}</span>
          </label>
        ))}
      </div>

      {motivo === "Otro" && (
        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Contanos más..."
          rows={3}
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      <button
        type="submit"
        disabled={!motivo || isPending}
        className="text-sm bg-zinc-800 hover:bg-zinc-900 text-white px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
      >
        {isPending ? "Enviando..." : "Enviar feedback"}
      </button>
    </form>
  );
}
