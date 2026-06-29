"use client";

import Link from "next/link";
import { useState, useRef } from "react";

const PROGRAMA_LINKS = [
  { href: "/#como-funciona", label: "Cómo funciona", sub: "Las 4 fases en la landing" },
  { href: "/misiones", label: "Misiones", sub: "1 misión por semana, aplicada a tu ronda" },
  { href: "/masterclasses", label: "Masterclasses", sub: "Contenido exclusivo · opcional" },
  { href: "/live-interviews", label: "Live Interviews", sub: "Founders y VCs en vivo" },
  { href: "/house-rules", label: "House Rules", sub: "Cómo opera el cohort" },
];

export function NavDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="nav-item nav-dropdown"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="nav-dropdown-trigger">
        Programa <span className="nav-caret">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          <div className="nav-dropdown-eyebrow">El programa en simple</div>
          {PROGRAMA_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
              <small>{l.sub}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
