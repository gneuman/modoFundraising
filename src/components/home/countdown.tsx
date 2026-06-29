"use client";

import { useEffect, useState } from "react";

function getTimeLeft(closeDate: string) {
  const diff = new Date(closeDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

interface CountdownProps {
  closeDate?: string;
  targetIso?: string;
  variant?: "full" | "mini" | "inline";
  compact?: boolean;
}

export function Countdown({ closeDate, targetIso, variant, compact }: CountdownProps) {
  const date = closeDate ?? targetIso ?? "2026-06-22T23:59:59-03:00";
  const resolvedVariant = compact ? "mini" : (variant ?? "full");
  const [t, setT] = useState(() => getTimeLeft(date));

  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(date)), 1000);
    return () => clearInterval(id);
  }, [date]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (resolvedVariant === "mini") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/70">
        Cierra en <span className="text-white">{t.days}d</span>
      </span>
    );
  }

  if (resolvedVariant === "inline") {
    return (
      <p className="text-sm text-white/60">
        Faltan <strong className="text-white">{t.days}</strong> días,{" "}
        <strong className="text-white">{pad(t.hours)}</strong> horas,{" "}
        <strong className="text-white">{pad(t.mins)}</strong> min para el cierre de la convocatoria.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {[
        { value: t.days, label: "Días" },
        { value: t.hours, label: "Horas" },
        { value: t.mins, label: "Min" },
        { value: t.secs, label: "Seg" },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-3xl font-black text-white leading-none">{pad(value)}</span>
          <span className="text-xs text-white/50 uppercase tracking-widest mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}
