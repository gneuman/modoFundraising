"use client";

import { useEffect, useRef, useState } from "react";

interface Testimonio {
  quote: string;
  autor: string;
  foto?: string;
}

export function TestimoniosCarousel({ items }: { items: Testimonio[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function go(index: number) {
    setCurrent((index + items.length) % items.length);
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((i) => (i + 1) % items.length), 7000);
  }

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className="testimonios-carousel">
      <button
        className="carousel-arrow carousel-arrow-prev"
        aria-label="Anterior"
        onClick={() => { go(current - 1); resetTimer(); }}
      >
        ‹
      </button>

      <div className="testimonios-track">
        {items.map((t, i) => (
          <div key={i} className={`testimonio-card testimonio-slide${i === current ? " active" : ""}`}>
            <div className="testimonio-photo">{t.foto ?? "🌎"}</div>
            <div>
              <p className="testimonio-quote">&ldquo;{t.quote}&rdquo;</p>
              <p className="testimonio-author">{t.autor}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        className="carousel-arrow carousel-arrow-next"
        aria-label="Siguiente"
        onClick={() => { go(current + 1); resetTimer(); }}
      >
        ›
      </button>

      <div className="carousel-dots">
        {items.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot${i === current ? " active" : ""}`}
            aria-label={`Slide ${i + 1}`}
            onClick={() => { go(i); resetTimer(); }}
          />
        ))}
      </div>
    </div>
  );
}
