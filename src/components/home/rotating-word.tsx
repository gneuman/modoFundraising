"use client";

import { useEffect, useState } from "react";

const WORDS = ["lograr?", "experimentar?", "vivir?", "hacer?", "aprender?"];

export function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        display: "inline-block",
        transition: "opacity 0.3s ease",
        opacity: visible ? 1 : 0,
        color: "var(--pink)",
      }}
    >
      {WORDS[index]}
    </span>
  );
}
