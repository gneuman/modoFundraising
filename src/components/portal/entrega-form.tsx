"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Paperclip, X, FileCheck } from "lucide-react";
import type { TareaRecord, ConsignaRecord } from "@/lib/airtable";

interface EntregaFormProps {
  tarea: TareaRecord;
  initialConsigna?: ConsignaRecord | null;
}

// Estado visual del EntregaForm
//   pending   → sin responder (ámbar)
//   submitted → enviada (verde) — botón dice "Actualizar"
//   editing   → el founder abrió el form para editar; muestra los campos
// El estado inicial depende de si viene `initialConsigna` con contenido.

function hasContent(c?: ConsignaRecord | null): boolean {
  if (!c) return false;
  return Boolean(
    (c.contenido_texto && c.contenido_texto.trim()) ||
      (c.url_extra && c.url_extra.trim()) ||
      (c.adjuntos && c.adjuntos.length > 0),
  );
}

export function EntregaForm({ tarea, initialConsigna }: EntregaFormProps) {
  const router = useRouter();
  const alreadySubmitted = hasContent(initialConsigna);

  const [editing, setEditing] = useState(false);
  const [contenido, setContenido] = useState(initialConsigna?.contenido_texto ?? "");
  const [urlExtra, setUrlExtra] = useState(initialConsigna?.url_extra ?? "");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingAdjuntos = initialConsigna?.adjuntos ?? [];

  // Vista "enviada" cerrada (verde)
  if (alreadySubmitted && !editing) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{tarea.titulo}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 shrink-0">
            Enviada
          </span>
        </div>

        {initialConsigna?.contenido_texto && (
          <p className="text-sm text-green-900/80 whitespace-pre-wrap leading-relaxed">
            {initialConsigna.contenido_texto}
          </p>
        )}
        {initialConsigna?.url_extra && (
          <a
            href={initialConsigna.url_extra}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {initialConsigna.url_extra}
          </a>
        )}
        {existingAdjuntos.length > 0 && (
          <ul className="space-y-1">
            {existingAdjuntos.map((a, i) => (
              <li key={a.url ?? i} className="flex items-center gap-2 text-xs text-green-800">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate"
                >
                  {a.filename}
                </a>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setEditing(true)}
          className="text-xs text-green-700 hover:text-green-900 font-medium underline underline-offset-2"
        >
          Actualizar respuesta
        </button>
      </div>
    );
  }

  // Vista form (nueva o edit)
  const canSubmit =
    Boolean(contenido.trim() || urlExtra.trim() || newFiles.length > 0 || existingAdjuntos.length > 0) &&
    !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (tarea.id) form.append("tareaId", tarea.id);
      if (contenido.trim()) form.append("contenido_texto", contenido);
      if (urlExtra.trim()) form.append("url_extra", urlExtra);
      for (const f of newFiles) form.append("files", f);

      const res = await fetch("/api/portal/consignas", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error ?? "Error al enviar");
      }
      setEditing(false);
      setNewFiles([]);
      // Refrescar server component para que traiga la consigna actualizada
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setNewFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const bgColor = alreadySubmitted ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200";
  const iconColor = alreadySubmitted ? "text-green-500" : "text-amber-500";

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        <FileCheck className={`h-4 w-4 ${iconColor}`} />
        <p className={`text-sm font-semibold ${alreadySubmitted ? "text-green-800" : "text-amber-800"}`}>
          {tarea.titulo}
        </p>
      </div>
      {tarea.descripcion && (
        <p className={`text-xs ${alreadySubmitted ? "text-green-700/80" : "text-amber-700"}`}>
          {tarea.descripcion}
        </p>
      )}

      <textarea
        placeholder="Escribí tu respuesta aquí. Podés pegar links directamente en el texto."
        rows={4}
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white"
      />

      <input
        type="url"
        placeholder="Link adicional (Google Drive, Notion, etc.) — opcional"
        value={urlExtra}
        onChange={(e) => setUrlExtra(e.target.value)}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white"
      />

      {/* Adjuntos ya guardados (readonly, sin botón para eliminar en fase 1) */}
      {existingAdjuntos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Adjuntos actuales:</p>
          <ul className="space-y-1">
            {existingAdjuntos.map((a, i) => (
              <li key={a.url ?? i} className="flex items-center gap-2 text-xs text-zinc-600">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate"
                >
                  {a.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nuevos archivos por subir */}
      {newFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Archivos por subir:</p>
          <ul className="space-y-1">
            {newFiles.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-zinc-700 bg-white rounded-lg px-2 py-1.5 border border-zinc-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-zinc-400 shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  className="text-zinc-400 hover:text-red-600 p-0.5"
                  aria-label="Quitar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="cursor-pointer text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors">
          <Paperclip className="h-3.5 w-3.5" />
          Adjuntar archivos
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {alreadySubmitted ? "Actualizar" : "Enviar"}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(false);
              setContenido(initialConsigna?.contenido_texto ?? "");
              setUrlExtra(initialConsigna?.url_extra ?? "");
              setNewFiles([]);
              setError(null);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-white"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
