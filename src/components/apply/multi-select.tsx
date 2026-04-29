"use client";

import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  error?: string;
}

export function MultiSelect({ options, value, onChange, error }: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", error && "border border-red-400/40 rounded-lg p-2")}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-sans font-medium border transition-colors",
            value.includes(opt)
              ? "text-white border-[#e5007e]"
              : "bg-white/5 text-white/60 border-[rgba(229,0,126,0.3)] hover:border-[#e5007e] hover:text-white"
          )}
          style={value.includes(opt) ? { background: "linear-gradient(135deg, #e5007e, #e217cf)" } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
