"use client";

import { useState } from "react";
import type { DesignTokens } from "@/lib/airtable";

const COLOR_FIELDS: { key: keyof DesignTokens; label: string; description: string }[] = [
  { key: "color_primary", label: "Color primario", description: "Rosa — botones, highlights, gradientes principales" },
  { key: "color_secondary", label: "Color secundario", description: "Naranja — CTAs, acentos cálidos" },
  { key: "color_teal", label: "Teal / Verde agua", description: "Acentos fríos, badges, íconos" },
  { key: "color_violet", label: "Violeta", description: "Tags, pills decorativas" },
  { key: "color_bg", label: "Fondo principal", description: "Background oscuro de la web" },
  { key: "color_bg_deep", label: "Fondo profundo", description: "Secciones con más contraste" },
  { key: "impacta_green", label: "Verde Impacta", description: "Sección Advisory, barra de coinversores" },
  { key: "impacta_green_deep", label: "Verde Impacta oscuro", description: "Hover y sombras del verde Impacta" },
];

const FONT_OPTIONS = ["Inter", "DM Sans", "Outfit", "Plus Jakarta Sans", "Geist", "Satoshi"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 px-6 border-b border-zinc-50 last:border-0">
      <span className="text-sm text-zinc-600 w-48 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-zinc-400">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 text-sm border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function DesignEditor({ tokens }: { tokens: DesignTokens }) {
  const [values, setValues] = useState(tokens);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateStr(key: keyof DesignTokens, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateNum(key: keyof DesignTokens, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/design-tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-8">

      {/* Colores */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Colores</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Los cambios se reflejan en toda la web al guardar</p>
        </div>
        <div className="divide-y divide-zinc-50">
          {COLOR_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center gap-4 px-6 py-4">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-lg border border-zinc-200 shadow-sm" style={{ backgroundColor: values[key] as string }} />
                <input type="color" value={values[key] as string} onChange={(e) => updateStr(key, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800">{label}</p>
                <p className="text-xs text-zinc-400 truncate">{description}</p>
              </div>
              <input type="text" value={values[key] as string} onChange={(e) => updateStr(key, e.target.value)} className="w-28 text-xs font-mono border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#000000" />
            </div>
          ))}
        </div>
      </div>

      {/* Tipografía */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Tipografía</h2>
        </div>
        <div className="px-6 py-5 flex items-center gap-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-zinc-700 block mb-2">Fuente principal</label>
            <select value={values.font_family} onChange={(e) => updateStr("font_family", e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="text-2xl font-bold text-zinc-800 px-6 py-3 bg-zinc-50 rounded-xl border border-zinc-100" style={{ fontFamily: `'${values.font_family}', sans-serif` }}>
            Modo Fundraising
          </div>
        </div>
      </div>

      {/* Configuración general */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Configuración general</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Fechas, WhatsApp y precios</p>
        </div>
        <Field label="Fecha de cierre (ISO)">
          <input
            type="text"
            value={values.close_date}
            onChange={(e) => updateStr("close_date", e.target.value)}
            className="w-60 text-sm font-mono border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2026-06-22T23:59:59-03:00"
          />
        </Field>
        <Field label="WhatsApp (solo número)">
          <input
            type="text"
            value={values.whatsapp_phone}
            onChange={(e) => updateStr("whatsapp_phone", e.target.value)}
            className="w-44 text-sm font-mono border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="56988888888"
          />
        </Field>
        <Field label="Precio upfront / mes">
          <NumberInput value={values.pricing_upfront_monthly} onChange={(v) => updateNum("pricing_upfront_monthly", v)} prefix="US$" />
        </Field>
        <Field label="Precio upfront total">
          <NumberInput value={values.pricing_upfront_total} onChange={(v) => updateNum("pricing_upfront_total", v)} prefix="US$" />
        </Field>
        <Field label="Precio mensual / mes">
          <NumberInput value={values.pricing_mensual_monthly} onChange={(v) => updateNum("pricing_mensual_monthly", v)} prefix="US$" />
        </Field>
        <Field label="Precio mensual total">
          <NumberInput value={values.pricing_mensual_total} onChange={(v) => updateNum("pricing_mensual_total", v)} prefix="US$" />
        </Field>
      </div>

      {/* Stats homepage */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Stats de la homepage</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Números que aparecen en la sección de tracción</p>
        </div>
        <Field label="Capital levantado (US$M)">
          <NumberInput value={values.stat_capital_usd_m} onChange={(v) => updateNum("stat_capital_usd_m", v)} prefix="US$" />
        </Field>
        <Field label="Startups del programa">
          <NumberInput value={values.stat_startups} onChange={(v) => updateNum("stat_startups", v)} prefix="+" />
        </Field>
        <Field label="Inversores activos">
          <NumberInput value={values.stat_inversores} onChange={(v) => updateNum("stat_inversores", v)} prefix="+" />
        </Field>
        <Field label="NPS">
          <NumberInput value={values.stat_nps} onChange={(v) => updateNum("stat_nps", v)} />
        </Field>
        <Field label="Capital promedio (US$M)">
          <NumberInput value={values.stat_capital_promedio_usd_m} onChange={(v) => updateNum("stat_capital_promedio_usd_m", v)} prefix="US$" />
        </Field>
        <Field label="Países alumni">
          <NumberInput value={values.stat_paises_alumni} onChange={(v) => updateNum("stat_paises_alumni", v)} />
        </Field>
      </div>

      {/* Preview */}
      <div className="rounded-xl p-8 text-white space-y-3" style={{ backgroundColor: values.color_bg, fontFamily: `'${values.font_family}', sans-serif` }}>
        <p className="text-xs text-white/40 uppercase tracking-widest">Preview</p>
        <h3 className="text-3xl font-bold" style={{ color: values.color_primary }}>
          Levantá tu ronda con los mejores
        </h3>
        <p className="text-white/60 text-sm">El programa más intensivo de fundraising de Latinoamérica.</p>
        <button className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${values.color_primary}, ${values.color_secondary})` }}>
          Postular a MF26
        </button>
        <p className="text-xs text-white/40 mt-4">
          Cierra: {values.close_date} · WhatsApp: +{values.whatsapp_phone} · Capital: US${values.stat_capital_usd_m}M · NPS: {values.stat_nps}
        </p>
      </div>

      {/* Guardar */}
      <div className="flex items-center justify-between pb-8">
        {saved ? <p className="text-sm text-green-600 font-medium">✓ Guardado en Airtable</p> : <span />}
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

    </div>
  );
}
