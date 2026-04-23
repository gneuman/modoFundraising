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
    <div className={cn("flex flex-wrap gap-2", error && "border border-red-300 rounded-lg p-2")}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            value.includes(opt)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-blue-300"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
