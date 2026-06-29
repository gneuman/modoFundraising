"use client";

import { useState } from "react";
import { DesignEditor } from "./design-editor";
import type {
  DesignTokens,
  LandingCard,
  HomeCasoExitoExtended,
  AdvisorExtended,
  Instructor,
} from "@/lib/airtable";

type Tab = "diseño" | "textos" | "casos" | "advisors" | "instructores";

const TABS: { id: Tab; label: string }[] = [
  { id: "diseño", label: "Colores y config" },
  { id: "textos", label: "Textos landing" },
  { id: "casos", label: "Casos de éxito" },
  { id: "advisors", label: "Advisors" },
  { id: "instructores", label: "Instructores" },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h2 className="font-semibold text-zinc-800">{title}</h2>
      </div>
      <div className="divide-y divide-zinc-50">{children}</div>
    </div>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const multiline = value.length > 80;
  return (
    <div className="px-6 py-4 flex flex-col gap-1">
      <span className="text-xs font-mono text-zinc-400">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}
    </div>
  );
}

function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-8">
      {saved ? <p className="text-sm text-green-600 font-medium">✓ Guardado</p> : <span />}
      <button onClick={onSave} disabled={saving}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

function TextosTab({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key: string, val: string) { setValues((p) => ({ ...p, [key]: val })); setSaved(false); }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/landing-textos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    setSaving(false); setSaved(true);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Textos de la landing">
        {Object.entries(values).map(([key, val]) => (
          <TextRow key={key} label={key} value={val} onChange={(v) => update(key, v)} />
        ))}
      </SectionCard>
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </div>
  );
}

function CasosTab({ initial }: { initial: HomeCasoExitoExtended[] }) {
  const [casos, setCasos] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(id: string, key: string, val: string | number) {
    setCasos((p) => p.map((c) => (c.id === id ? { ...c, [key]: val } : c))); setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/casos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(casos) });
    setSaving(false); setSaved(true);
  }

  return (
    <div className="space-y-6">
      {casos.map((c) => (
        <SectionCard key={c.id} title={c.startup_nombre ?? "Caso"}>
          <TextRow label="startup_nombre" value={c.startup_nombre ?? ""} onChange={(v) => update(c.id!, "startup_nombre", v)} />
          <TextRow label="monto_usd" value={String(c.monto_usd ?? "")} onChange={(v) => update(c.id!, "monto_usd", Number(v))} />
          <TextRow label="hook" value={c.hook ?? ""} onChange={(v) => update(c.id!, "hook", v)} />
          <TextRow label="investors" value={c.investors ?? ""} onChange={(v) => update(c.id!, "investors", v)} />
          <TextRow label="pais_emoji" value={(c as unknown as Record<string, unknown>).pais_emoji as string ?? ""} onChange={(v) => update(c.id!, "pais_emoji", v)} />
          <TextRow label="quote_founder" value={(c as unknown as Record<string, unknown>).quote_founder as string ?? ""} onChange={(v) => update(c.id!, "quote_founder", v)} />
        </SectionCard>
      ))}
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </div>
  );
}

function AdvisorsTab({ initial }: { initial: AdvisorExtended[] }) {
  const [advisors, setAdvisors] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(id: string, key: string, val: string | number) {
    setAdvisors((p) => p.map((a) => (a.id === id ? { ...a, [key]: val } : a))); setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/advisors", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(advisors) });
    setSaving(false); setSaved(true);
  }

  return (
    <div className="space-y-6">
      {advisors.map((a) => (
        <SectionCard key={a.id} title={a.nombre ?? "Advisor"}>
          <TextRow label="nombre" value={a.nombre ?? ""} onChange={(v) => update(a.id!, "nombre", v)} />
          <TextRow label="cargo" value={a.cargo ?? ""} onChange={(v) => update(a.id!, "cargo", v)} />
          <TextRow label="foto_url" value={a.foto_url ?? ""} onChange={(v) => update(a.id!, "foto_url", v)} />
          <TextRow label="calendly_url" value={a.calendly_url ?? ""} onChange={(v) => update(a.id!, "calendly_url", v)} />
          <TextRow label="cupos_total" value={String(a.cupos_total ?? "")} onChange={(v) => update(a.id!, "cupos_total", Number(v))} />
          <TextRow label="cupos_disponibles" value={String(a.cupos_disponibles ?? "")} onChange={(v) => update(a.id!, "cupos_disponibles", Number(v))} />
        </SectionCard>
      ))}
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </div>
  );
}

function InstructoresTab({ initial }: { initial: Instructor[] }) {
  const [instructores, setInstructores] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(idx: number, key: string, val: string | number) {
    setInstructores((p) => p.map((inst, i) => (i === idx ? { ...inst, [key]: val } : inst))); setSaved(false);
  }

  function add() {
    setInstructores((p) => [...p, { nombre: "", foto_url: "", rol: "", org: "", orden: p.length + 1, activa: true }]); setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/instructores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(instructores) });
    setSaving(false); setSaved(true);
  }

  return (
    <div className="space-y-6">
      {instructores.map((inst, i) => (
        <SectionCard key={i} title={inst.nombre || `Instructor ${i + 1}`}>
          <TextRow label="nombre" value={inst.nombre} onChange={(v) => update(i, "nombre", v)} />
          <TextRow label="rol" value={inst.rol} onChange={(v) => update(i, "rol", v)} />
          <TextRow label="org" value={inst.org} onChange={(v) => update(i, "org", v)} />
          <TextRow label="foto_url" value={inst.foto_url} onChange={(v) => update(i, "foto_url", v)} />
          <TextRow label="orden" value={String(inst.orden)} onChange={(v) => update(i, "orden", Number(v))} />
        </SectionCard>
      ))}
      <button onClick={add} className="text-sm text-blue-600 hover:underline">+ Agregar instructor</button>
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </div>
  );
}

interface Props {
  tokens: DesignTokens;
  textos: Record<string, string>;
  outcomes: LandingCard[];
  pillars: LandingCard[];
  casos: HomeCasoExitoExtended[];
  advisors: AdvisorExtended[];
  instructores: Instructor[];
}

export function DesignPageTabs({ tokens, textos, casos, advisors, instructores }: Props) {
  const [tab, setTab] = useState<Tab>("diseño");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Diseño y contenido</h1>
        <p className="text-sm text-zinc-500 mt-1">Edita colores, textos y datos de la web — todo se guarda en Airtable</p>
      </div>

      <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "diseño" && <DesignEditor tokens={tokens} />}
      {tab === "textos" && <TextosTab initial={textos} />}
      {tab === "casos" && <CasosTab initial={casos} />}
      {tab === "advisors" && <AdvisorsTab initial={advisors} />}
      {tab === "instructores" && <InstructoresTab initial={instructores} />}
    </div>
  );
}
