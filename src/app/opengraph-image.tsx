import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Modo Fundraising 2026 — Impacta VC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0e1a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 600,
            height: 600,
            background: "radial-gradient(ellipse at top right, rgba(0,229,192,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Powered by Oracle badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "white",
            borderRadius: 100,
            padding: "8px 20px",
            marginBottom: 40,
          }}
        >
          <span style={{ color: "#0a0e1a", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 4 }}>Powered by</span>
          <span style={{ color: "#c74634", fontWeight: 900, fontSize: 20, letterSpacing: -1 }}>ORACLE</span>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          <span style={{ color: "white", fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>MODO</span>
          <span style={{ color: "#00e5c0", fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>FUNDRAISING</span>
        </div>

        {/* Subtitle */}
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 28, fontWeight: 600, margin: 0, marginBottom: 48, maxWidth: 700 }}>
          Construye momentum que los inversionistas no puedan ignorar.
        </p>

        {/* Pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["US$349/mes", "13 semanas", "100% online", "LatAm"].map((item) => (
            <div
              key={item}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 100,
                padding: "8px 20px",
                color: "white",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 80,
            color: "rgba(255,255,255,0.3)",
            fontSize: 18,
          }}
        >
          modofundraising.com
        </div>
      </div>
    ),
    size,
  );
}
