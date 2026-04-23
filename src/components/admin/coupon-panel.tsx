"use client";

import { Tag, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CouponRecord } from "@/lib/airtable";

interface Props {
  coupons: CouponRecord[];
  onDragStart: (coupon: CouponRecord) => void;
}

function pctColor(pct: number) {
  if (pct === 100) return "bg-purple-100 text-purple-700 border-purple-200";
  if (pct >= 50)   return "bg-red-50 text-red-600 border-red-200";
  if (pct >= 25)   return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-blue-50 text-blue-600 border-blue-200";
}

export function CouponPanel({ coupons, onDragStart }: Props) {
  const active = coupons.filter((c) => c.active);

  return (
    <div className="w-52 shrink-0">
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 border-b border-zinc-100">
          <Tag className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Cupones</span>
        </div>

        <div className="p-2 space-y-1.5">
          {active.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-3">Sin cupones activos</p>
          )}
          {active.map((c) => (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("type", "coupon");
                e.dataTransfer.setData("coupon", JSON.stringify(c));
                onDragStart(c);
              }}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 select-none transition-all hover:shadow-sm",
                pctColor(c.discount_percent)
              )}
            >
              <GripVertical className="h-3 w-3 opacity-40 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold truncate">{c.code}</p>
                <p className="opacity-70 font-normal">{c.discount_percent}% off</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 pb-3 pt-1">
          <p className="text-xs text-zinc-300 text-center leading-tight">
            Arrastrá un cupón<br />sobre una postulación
          </p>
        </div>
      </div>
    </div>
  );
}
