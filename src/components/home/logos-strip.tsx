"use client";

import Image from "next/image";

interface Logo {
  nombre: string;
  logo_url: string;
  alt: string;
}

interface LogosStripProps {
  logos: Logo[];
}

const PLACEHOLDERS = [
  "Startup A", "Startup B", "Startup C", "Startup D",
  "Startup E", "Startup F", "Startup G", "Startup H",
];

export function LogosStrip({ logos }: LogosStripProps) {
  const items = logos.length > 0 ? logos : PLACEHOLDERS.map((n) => ({ nombre: n, logo_url: "", alt: n }));

  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-8 animate-marquee whitespace-nowrap items-center py-4">
        {[...items, ...items].map(({ nombre, logo_url, alt }, i) => (
          <div key={i} className="flex-shrink-0">
            {logo_url ? (
              <Image src={logo_url} alt={alt} width={100} height={40} className="object-contain opacity-60 hover:opacity-100 transition-opacity" />
            ) : (
              <span className="text-white/40 text-sm font-semibold px-3">{nombre}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
