"use client";

import { useState } from "react";
import Link from "next/link";

const MODES = {
  upfront: {
    label: "Pago completo",
    saving: "Ahorras ~US$210",
    amount: "US$279",
    suffix: "por mes · pago único · US$837 total · 3 meses",
    finePrint:
      "El programa entrega valor completo en cualquiera de las dos modalidades. Pago completo asegura tu cupo hasta el final con descuento.",
  },
  mensual: {
    label: "Pago mensual",
    saving: "Cancela cuando quieras",
    amount: "US$349",
    suffix: "por mes · US$1.047 total · 3 meses",
    finePrint:
      "Con pago mensual puedes desuscribirte en cualquier momento. Después de los 14 días pierdes acceso al terminar el mes pagado.",
  },
};

const FEATURES = [
  "3 meses · 100% online · 13 semanas en vivo",
  "Money Back 14 días sin requisito de asistencia, en ambas modalidades",
  "Portal del cohort: clases grabadas, misiones, features y entregables",
  "Acceso a +200 inversionistas activos en la red de Impacta",
  "Comunidad alumni vitalicia con +400 founders LatAm",
];

export function PricingToggle() {
  const [mode, setMode] = useState<"upfront" | "mensual">("upfront");
  const m = MODES[mode];

  return (
    <div className="pricing-single-card">
      {/* Toggle */}
      <div className="pricing-toggle" role="tablist">
        {(["upfront", "mensual"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`pricing-toggle-option${mode === key ? " active" : ""}`}
          >
            <span className="toggle-label">{MODES[key].label}</span>
            <span className="toggle-saving">{MODES[key].saving}</span>
          </button>
        ))}
      </div>

      {/* Precio */}
      <div className="pricing-display">
        <div className="pricing-amount">{m.amount}</div>
        <div className="pricing-amount-suffix">{m.suffix}</div>
      </div>

      {/* Features */}
      <ul className="pricing-features">
        {FEATURES.map((f) => (
          <li key={f}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9 11l3 3 8-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="pricing-fine-print">{m.finePrint}</p>

      <Link href="/apply" className="cta-primary pricing-cta">
        Postular a MF26 →
      </Link>

      <p className="pricing-selection-note">
        * Pitch training quincenal y Demo Day final son solo para startups seleccionadas del cohort.
        Postular no asegura ingreso.
      </p>
    </div>
  );
}
