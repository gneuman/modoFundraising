"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function RefundsYearFilter({
  current,
  options,
}: {
  current: number;
  options: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams?.toString());
    next.set("refundsYear", e.target.value);
    startTransition(() => {
      router.push(`?${next.toString()}#reembolsos`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="refundsYear" className="text-zinc-500">Año:</label>
      <select
        id="refundsYear"
        name="refundsYear"
        defaultValue={current}
        onChange={onChange}
        disabled={isPending}
        className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-rose-300 disabled:opacity-60"
      >
        {options.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
