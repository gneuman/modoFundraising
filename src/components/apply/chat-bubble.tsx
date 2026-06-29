"use client";

import Image from "next/image";

interface ChatBubbleProps {
  from: "bot" | "user";
  text: string;
  showAvatar?: boolean;
}

export function ChatBubble({ from, text, showAvatar }: ChatBubbleProps) {
  if (from === "bot") {
    return (
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex-shrink-0 mt-0.5 overflow-hidden border-2 ${showAvatar ? "opacity-100" : "opacity-0"}`} style={{ borderColor: "#e5007e" }}>
          <Image src="/ifsp/victor-lau.webp" alt="Impacta VC" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <div className="text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "linear-gradient(135deg, rgba(229,0,126,0.18), rgba(226,23,207,0.12))", border: "1px solid rgba(229,0,126,0.25)" }}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)", border: "1px solid rgba(229,0,126,0.4)" }}>
        {text}
      </div>
    </div>
  );
}
