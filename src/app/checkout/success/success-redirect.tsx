"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export function SuccessRedirect({ redirectUrl }: { redirectUrl: string }) {
  const router = useRouter();
  const [secs, setSecs] = useState(5);

  // Confetti burst on mount + continuous for 5s
  useEffect(() => {
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ffffff"];

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors });

    const interval = setInterval(() => {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors,
      });
    }, 700);

    const stop = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, []);

  // Countdown + redirect
  useEffect(() => {
    if (secs <= 0) {
      router.push(redirectUrl);
      return;
    }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, redirectUrl, router]);

  return (
    <p className="text-sm text-zinc-400">
      Entrando al portal en <span className="font-semibold text-zinc-600">{secs}s</span>…
    </p>
  );
}
