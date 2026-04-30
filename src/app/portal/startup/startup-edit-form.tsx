"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StartupRecord } from "@/lib/airtable";
import { guardarStartup } from "./actions";

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Serie C+"];
const MODELS = ["B2B SaaS", "B2C", "Marketplace", "E-commerce", "Servicios", "Hardware", "Otro"];

interface Props {
  startup: StartupRecord;
}

export function StartupEditForm({ startup }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await guardarStartup(fd);
        toast.success("Startup actualizada");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-800">Editar startup</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Nombre */}
              <Field label="Nombre de la startup" name="startup_name" defaultValue={startup.startup_name} required />

              {/* Descripción */}
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Descripción</label>
                <textarea
                  name="startup_description"
                  defaultValue={startup.startup_description ?? ""}
                  rows={3}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Sitio web" name="startup_website" defaultValue={startup.startup_website} placeholder="https://..." />
                <Field label="LinkedIn" name="startup_linkedin" defaultValue={startup.startup_linkedin} placeholder="https://linkedin.com/company/..." />
              </div>
              <Field label="Link al deck" name="deck_url" defaultValue={startup.deck_url} placeholder="https://..." />

              <div className="border-t border-zinc-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* País */}
                <Field label="País de operación" name="startup_country_ops" defaultValue={startup.startup_country_ops} />

                {/* Etapa */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Etapa</label>
                  <select name="startup_stage" defaultValue={startup.startup_stage ?? ""}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Seleccionar</option>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Modelo de negocio */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Modelo de negocio</label>
                  <select name="business_model" defaultValue={startup.business_model ?? ""}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Seleccionar</option>
                    {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Industrias */}
                <Field label="Industrias" name="startup_industries" defaultValue={startup.startup_industries} placeholder="Fintech, Edtech..." />

                {/* Tamaño equipo */}
                <Field label="Tamaño del equipo" name="startup_team_size" defaultValue={startup.startup_team_size} type="number" placeholder="4" />

                {/* MRR */}
                <Field label="MRR (USD)" name="startup_mrr" defaultValue={startup.startup_mrr} type="number" placeholder="5000" />

                {/* Ventas 12m */}
                <Field label="Ventas últimos 12m (USD)" name="startup_sales_12m" defaultValue={startup.startup_sales_12m} type="number" placeholder="60000" />

                {/* Ronda */}
                <Field label="Serie de ronda" name="round_series" defaultValue={startup.round_series} placeholder="Seed, Series A..." />

                {/* Tamaño ronda */}
                <Field label="Tamaño de ronda (USD)" name="round_size" defaultValue={startup.round_size} type="number" placeholder="500000" />

                {/* Runway */}
                <Field label="Runway (meses)" name="runway" defaultValue={startup.runway} type="number" placeholder="18" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {pending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

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
