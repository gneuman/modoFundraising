"use client";

import { useEffect, useRef, useState } from "react";

interface Metric {
  label: string;
  value: string;
  suffix?: string;
}

interface MetricsAnimatedProps {
  metrics: Metric[];
}

export function MetricsAnimated({ metrics }: MetricsAnimatedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
      {metrics.map(({ label, value, suffix }) => (
        <div
          key={label}
          className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="text-3xl md:text-4xl font-black text-[var(--brand-teal)]">
            {value}{suffix}
          </div>
          <div className="text-white/50 text-sm mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
