"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StartupRecord, FounderRecord } from "@/lib/airtable";
import { guardarPerfil } from "./actions";

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Serie C+"];
const MODELS = ["B2B SaaS", "B2C", "Marketplace", "E-commerce", "Servicios", "Hardware", "Otro"];
const USA_OPTIONS = ["No", "Sí", "Ya operamos en USA"];

interface Props {
  startup: StartupRecord;
  founder?: Partial<FounderRecord>;
  autoOpen?: boolean;
  inline?: boolean;
}

export function StartupEditForm({ startup, founder, autoOpen = false, inline = false }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [pending, startTransition] = useTransition();
  const [descLen, setDescLen] = useState((startup.startup_description ?? "").length);
  const [priorFundraising, setPriorFundraising] = useState(startup.prior_fundraising ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await guardarPerfil(fd);
        toast.success("Perfil actualizado");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">

              {/* ── Sección: Tu perfil ── */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Tu perfil</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre" name="first_name" defaultValue={founder?.first_name} required />
                  <Field label="Apellido" name="last_name" defaultValue={founder?.last_name} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="WhatsApp" name="whatsapp" defaultValue={founder?.whatsapp} placeholder="+1415..." />
                  <Field label="LinkedIn" name="linkedin_founder" defaultValue={founder?.linkedin_founder} placeholder="https://linkedin.com/in/..." type="url" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Rol en la startup" name="founder_role" defaultValue={founder?.founder_role} />
                  <Field label="País de residencia" name="country_residence" defaultValue={founder?.country_residence} />
                </div>

                <RadioGroup
                  label="¿Hay mujeres en el equipo fundador?"
                  name="founder_team_women"
                  options={["Sí", "No"]}
                  defaultValue={founder?.founder_team_women ?? ""}
                />
              </section>

              {/* ── Sección: Tu startup ── */}
              <section className="space-y-4 border-t border-zinc-100 pt-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Tu startup</h3>

                <Field label="Nombre de la startup" name="startup_name" defaultValue={startup.startup_name} required />

                {/* Descripción con contador */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">
                    Descripción
                    <span className="ml-2 text-zinc-400 font-normal">{descLen}/300 caracteres</span>
                  </label>
                  <textarea
                    name="startup_description"
                    defaultValue={startup.startup_description ?? ""}
                    maxLength={300}
                    rows={3}
                    onChange={(e) => setDescLen(e.target.value.length)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Sitio web" name="startup_website" defaultValue={startup.startup_website} placeholder="https://..." type="url" />
                  <Field label="LinkedIn" name="startup_linkedin" defaultValue={startup.startup_linkedin} placeholder="https://linkedin.com/company/..." type="url" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="País de operación" name="startup_country_ops" defaultValue={startup.startup_country_ops} />
                  <Field label="Países de expansión" name="startup_countries_expansion" defaultValue={startup.startup_countries_expansion} placeholder="USA, México, Colombia..." />
                </div>

                <SelectField
                  label="¿Ya operan en USA o es expansión?"
                  name="startup_usa_intl"
                  defaultValue={startup.startup_usa_intl ?? ""}
                  options={USA_OPTIONS}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Industrias" name="startup_industries" defaultValue={startup.startup_industries} placeholder="Fintech, Edtech..." />
                  <SelectField label="Modelo de negocio" name="business_model" defaultValue={startup.business_model ?? ""} options={MODELS} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField label="Etapa" name="startup_stage" defaultValue={startup.startup_stage ?? ""} options={STAGES} />
                  <Field label="Tamaño del equipo" name="startup_team_size" defaultValue={startup.startup_team_size} type="number" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="MRR en USD" name="startup_mrr" defaultValue={startup.startup_mrr} type="number" />
                  <Field label="Ventas últimos 12m en USD" name="startup_sales_12m" defaultValue={startup.startup_sales_12m} type="number" />
                </div>

                <RadioGroup
                  label="¿Han levantado capital antes?"
                  name="prior_fundraising"
                  options={["Sí", "No (esta sería nuestra primera ronda)"]}
                  defaultValue={priorFundraising}
                  onChange={setPriorFundraising}
                />

                {priorFundraising === "Sí" && (
                  <Field label="Monto levantado antes (USD)" name="prior_fundraising_amount" defaultValue={startup.prior_fundraising_amount} type="number" />
                )}

                <RadioGroup
                  label="¿Tienen ronda abierta?"
                  name="round_open"
                  options={["Sí", "No (pero la iniciaremos en los próximos 12 meses)"]}
                  defaultValue={startup.round_open ?? ""}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Serie de ronda" name="round_series" defaultValue={startup.round_series} />
                  <Field label="Tamaño de ronda en USD" name="round_size" defaultValue={startup.round_size} type="number" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Valuación en USD" name="startup_valuation" defaultValue={startup.startup_valuation} type="number" />
                  <Field label="Tickets objetivo" name="round_tickets" defaultValue={startup.round_tickets} placeholder="US $500K - $1M" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Runway en meses" name="runway" defaultValue={startup.runway} type="number" />
                  <Field label="Link al deck" name="deck_url" defaultValue={startup.deck_url} placeholder="https://..." type="url" />
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                {!inline && (
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {pending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : "Guardar cambios"}
                </Button>
              </div>
            </form>
  );

  if (inline) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-800">Completa tu perfil</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Necesitamos estos datos para tu participación en el programa.</p>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar perfil
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-800">Editar perfil</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formContent}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label, name, defaultValue, type = "text", placeholder, required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 block mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({
  label, name, defaultValue, options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 block mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">Seleccionar</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function RadioGroup({
  label, name, options, defaultValue, onChange,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-600 mb-2">{label}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt}
              defaultChecked={defaultValue === opt}
              onChange={() => onChange?.(opt)}
              className="accent-blue-600"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
