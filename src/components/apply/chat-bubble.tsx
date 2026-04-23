"use client";

interface ChatBubbleProps {
  from: "bot" | "user";
  text: string;
  showAvatar?: boolean;
}

export function ChatBubble({ from, text, showAvatar }: ChatBubbleProps) {
  if (from === "bot") {
    return (
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${showAvatar ? "bg-blue-600" : "opacity-0"}`}>
          <span className="text-white text-xs font-bold">IV</span>
        </div>
        <div className="bg-white/10 backdrop-blur-sm text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}
