"use client";

import { useEffect, useRef } from "react";
import { Video } from "lucide-react";

interface Props {
  embedUrl: string | null;
  fallbackUrl?: string;
  claseId: string;
}

export function VideoPlayer({ embedUrl, fallbackUrl, claseId }: Props) {
  const logged = useRef(false);

  // Detecta cuando el usuario foca el iframe (equivale a que interactuó con el video)
  useEffect(() => {
    if (!embedUrl) return;

    function onBlur() {
      if (logged.current) return;
      // El foco del window se pierde cuando el usuario hace click en el iframe
      if (document.activeElement?.tagName === "IFRAME") {
        logged.current = true;
        fetch("/api/portal/video-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claseId }),
        }).catch(() => {/* silent */});
      }
    }

    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [embedUrl, claseId]);

  if (embedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-black aspect-video">
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (fallbackUrl) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-center space-y-3">
        <Video className="h-10 w-10 text-zinc-300 mx-auto" />
        <p className="text-zinc-500 text-sm">El video no puede embeberse directamente.</p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            if (!logged.current) {
              logged.current = true;
              fetch("/api/portal/video-play", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ claseId }),
              }).catch(() => {/* silent */});
            }
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Video className="h-4 w-4" /> Ver grabación
        </a>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-10 text-center text-zinc-400 text-sm">
      La grabación estará disponible próximamente.
    </div>
  );
}
