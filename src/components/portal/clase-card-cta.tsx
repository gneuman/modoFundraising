"use client";

import { Video } from "lucide-react";
import { EnterMeetButton } from "./enter-meet-button";

interface Props {
  claseId: string;
  isLive: boolean;
  meetUrl?: string;
  recordingUrl?: string;
}

export function ClaseCardCTA({ claseId, isLive, meetUrl, recordingUrl }: Props) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (isLive && meetUrl) {
    return (
      <span onClick={stop} className="inline-block">
        <EnterMeetButton claseId={claseId} meetUrl={meetUrl} label="Entrar a la clase" />
      </span>
    );
  }

  if (recordingUrl) {
    return (
      <a
        href={recordingUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        <Video className="h-3 w-3" /> Ver grabación
      </a>
    );
  }

  return <span className="text-xs text-zinc-400">Próxima</span>;
}
