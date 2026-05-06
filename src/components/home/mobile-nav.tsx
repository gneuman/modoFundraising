"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Programa" },
  { href: "/cronograma", label: "Cronograma" },
  { href: "/advisory", label: "Advisory" },
  { href: "/masterclasses", label: "Masterclasses" },
  { href: "/rockstars", label: "Rockstars" },
  { href: "/qa", label: "Q&A" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo-mf.png"
              alt="Modo Fundraising"
              width={80}
              height={50}
              className="object-contain"
              priority
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-white transition-colors">
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/apply"
              className="bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold text-sm px-5 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              Postular
            </Link>
            {/* Hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-2.5 min-w-[44px] min-h-[44px] items-center justify-center"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-[#0d1220] border-l border-white/10 flex flex-col pt-20 px-6 gap-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-white/80 hover:text-white text-lg py-3 border-b border-white/10 transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="mt-6 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold text-center py-3 rounded-xl transition-colors"
              onClick={() => setOpen(false)}
            >
              Postular ahora →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
