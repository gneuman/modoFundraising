"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  targetIso: string; // ISO string with timezone offset
  className?: string;
  compact?: boolean;
}

export function Countdown({ targetIso, className = "", compact = false }: CountdownProps) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (compact) {
    return (
      <span className={`tabular-nums font-bold text-[#00e5c0] ${className}`}>
        {time.days}d {pad(time.hours)}h {pad(time.minutes)}m {pad(time.seconds)}s
      </span>
    );
  }

  const items = [
    { label: "Días", value: pad(time.days) },
    { label: "Hrs", value: pad(time.hours) },
    { label: "Min", value: pad(time.minutes) },
    { label: "Seg", value: pad(time.seconds) },
  ];

  return (
    <div className={`flex gap-3 ${className}`}>
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold text-[#00e5c0] tabular-nums leading-none">{value}</span>
          <span className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  );
}
