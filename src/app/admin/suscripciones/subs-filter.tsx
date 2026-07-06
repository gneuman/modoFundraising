"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTER_TABS = [
  { key: "todos", label: "Todos" },
  { key: "anomalias", label: "Con anomalía" },
  { key: "morosos", label: "Morosos" },
];

export function SubsFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(value: string) {
    const q = new URLSearchParams(params);
    if (value === "todos") q.delete("filter");
    else q.set("filter", value);
    const qs = q.toString();
    router.push(`/admin/suscripciones${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTER_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => update(t.key)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            currentFilter === t.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
