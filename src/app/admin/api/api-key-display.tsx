"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CopyButton } from "./copy-button";

export function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [visible, setVisible] = useState(false);
  const masked = apiKey.slice(0, 12) + "•".repeat(apiKey.length - 12);

  return (
    <div className="bg-zinc-900 rounded-xl p-5 space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">API Key</p>

      <div className="flex items-center gap-3">
        <code className="text-green-400 font-mono text-sm flex-1 break-all select-all">
          {visible ? apiKey : masked}
        </code>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setVisible((v) => !v)}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
            title={visible ? "Ocultar" : "Mostrar"}
          >
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {visible ? "Ocultar" : "Mostrar"}
          </button>
          <CopyButton text={apiKey} />
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <p className="text-xs text-zinc-500 mb-1">Header requerido en todos los endpoints:</p>
        <code className="text-xs text-zinc-300 font-mono">
          Authorization: Bearer {visible ? apiKey : masked}
        </code>
      </div>
    </div>
  );
}
