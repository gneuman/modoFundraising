"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Muestra el link del día para "misiones atrasadas" con botón de copiar.
// El token ya viene firmado del server; este componente solo lo presenta.
export function LinkAtrasadas({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: seleccionar el texto si el clipboard falla.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700"
      />
      <button
        onClick={copiar}
        className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
