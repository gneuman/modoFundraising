"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Paperclip, X, FileCheck, AlertCircle } from "lucide-react";
import type { TareaRecord, ConsignaRecord } from "@/lib/airtable";
import { Markdown } from "@/components/portal/markdown";

interface EntregaFormProps {
  tarea: TareaRecord;
  initialConsigna?: ConsignaRecord | null;
}

// Estado de un archivo por subir:
// - pending: agregado, no subido
// - uploading: en proceso
// - success: subido OK
// - error: falló, muestra mensaje
type FileUploadStatus = "pending" | "uploading" | "success" | "error";
type PendingFile = {
  file: File;
  status: FileUploadStatus;
  error?: string;
};

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
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

  const canSubmit =
    Boolean(
      contenido.trim() ||
        urlExtra.trim() ||
        pendingFiles.length > 0 ||
        existingAdjuntos.length > 0,
    ) && !loading;

  // Sube UN archivo a un consignaId. Actualiza el status en pendingFiles.
  async function uploadOne(consignaId: string, idx: number): Promise<boolean> {
    const pf = pendingFiles[idx];
    if (!pf) return false;

    setPendingFiles((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], status: "uploading" };
      return copy;
    });

    try {
      const fd = new FormData();
      fd.append("file", pf.file);
      const res = await fetch(`/api/portal/consignas/${consignaId}/adjuntos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setPendingFiles((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status: "success" };
        return copy;
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir";
      setPendingFiles((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status: "error", error: msg };
        return copy;
      });
      return false;
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      // Paso 1: crear/actualizar la consigna con texto y URL (sin adjuntos).
      const fd = new FormData();
      if (tarea.id) fd.append("tareaId", tarea.id);
      if (contenido.trim()) fd.append("contenido_texto", contenido);
      if (urlExtra.trim()) fd.append("url_extra", urlExtra);
      // ?t=<token>: link admin de misiones atrasadas → marcar entrega tardía.
      const lateToken =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("t")
          : null;
      if (lateToken) fd.append("t", lateToken);

      const res = await fetch("/api/portal/consignas", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.consignaId) {
        throw new Error(data?.error ?? `Error al guardar (${res.status})`);
      }
      const consignaId: string = data.consignaId;

      // Paso 2: si hay archivos pendientes, subirlos secuencialmente y mostrar
      // el status por cada uno. El form NO se cierra hasta que todos terminen.
      const filesToUpload = pendingFiles
        .map((pf, i) => ({ pf, i }))
        .filter(({ pf }) => pf.status !== "success");

      let failed = 0;
      for (const { i } of filesToUpload) {
        const ok = await uploadOne(consignaId, i);
        if (!ok) failed++;
      }

      if (failed > 0) {
        setError(
          `Se guardó el texto pero ${failed} de ${filesToUpload.length} archivo(s) fallaron. Podés reintentar solo los que fallaron.`,
        );
        setLoading(false);
        return;
      }

      // Todo OK. Cerramos el form y refrescamos.
      setEditing(false);
      setPendingFiles([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newOnes: PendingFile[] = Array.from(files).map((f) => ({
      file: f,
      status: "pending",
    }));
    setPendingFiles((prev) => [...prev, ...newOnes]);
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const bgColor = alreadySubmitted ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200";
  const iconColor = alreadySubmitted ? "text-green-500" : "text-amber-500";

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        <FileCheck className={`h-4 w-4 ${iconColor}`} />
        <p
          className={`text-sm font-semibold ${
            alreadySubmitted ? "text-green-800" : "text-amber-800"
          }`}
        >
          {tarea.titulo}
        </p>
      </div>
      {tarea.descripcion && (
        <Markdown
          className={`!text-xs !space-y-1 ${
            alreadySubmitted ? "!text-green-700/80" : "!text-amber-700"
          }`}
        >
          {tarea.descripcion}
        </Markdown>
      )}

      <textarea
        placeholder="Escribí tu respuesta aquí. Podés pegar links directamente en el texto."
        rows={4}
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        disabled={loading}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white disabled:opacity-60"
      />

      <input
        type="url"
        placeholder="Link adicional (Google Drive, Notion, etc.) — opcional"
        value={urlExtra}
        onChange={(e) => setUrlExtra(e.target.value)}
        disabled={loading}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white disabled:opacity-60"
      />

      {/* Adjuntos ya guardados en Airtable (readonly aquí) */}
      {existingAdjuntos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Adjuntos actuales:</p>
          <ul className="space-y-1">
            {existingAdjuntos.map((a, i) => (
              <li
                key={a.url ?? i}
                className="flex items-center gap-2 text-xs text-zinc-600"
              >
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

      {/* Archivos por subir — con status por archivo */}
      {pendingFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">
            Archivos ({pendingFiles.filter((p) => p.status === "success").length}/
            {pendingFiles.length} subidos):
          </p>
          <ul className="space-y-1">
            {pendingFiles.map((pf, i) => {
              const isSuccess = pf.status === "success";
              const isError = pf.status === "error";
              const isUploading = pf.status === "uploading";
              const bg = isSuccess
                ? "bg-green-50 border-green-200"
                : isError
                ? "bg-red-50 border-red-200"
                : "bg-white border-zinc-100";
              return (
                <li
                  key={`${pf.file.name}-${i}`}
                  className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 border ${bg}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    ) : isError ? (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    ) : isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 text-amber-600 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    )}
                    <span className="truncate text-zinc-700">{pf.file.name}</span>
                    <span className="text-zinc-400 shrink-0">
                      ({(pf.file.size / 1024).toFixed(0)} KB)
                    </span>
                    {isError && pf.error && (
                      <span className="text-red-600 shrink-0 truncate">
                        — {pf.error}
                      </span>
                    )}
                  </div>
                  {!isUploading && !isSuccess && (
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="text-zinc-400 hover:text-red-600 p-0.5"
                      aria-label="Quitar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className={`text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Adjuntar archivos
          <input
            type="file"
            multiple
            disabled={loading}
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
          {loading
            ? "Enviando…"
            : alreadySubmitted
            ? "Actualizar"
            : "Enviar"}
        </button>
        {editing && !loading && (
          <button
            onClick={() => {
              setEditing(false);
              setContenido(initialConsigna?.contenido_texto ?? "");
              setUrlExtra(initialConsigna?.url_extra ?? "");
              setPendingFiles([]);
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
