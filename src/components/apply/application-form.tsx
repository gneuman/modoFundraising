"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormProgress } from "./form-progress";
import { FieldWrapper } from "./field-wrapper";
import { MultiSelect } from "./multi-select";
import { applicationSchema, type ApplicationFormData } from "@/lib/form-schema";
import { ALL_COUNTRIES, LATAM_COUNTRIES } from "@/lib/countries";

const STORAGE_KEY = "mf2026_form";
const TOTAL_STEPS = 8;

const STEP_LABELS = [
  "Datos del Founder",
  "Datos de la Startup",
  "Tracción",
  "Historial de Capital",
  "Ronda Actual",
  "Pitch Deck",
  "Recomendadores",
  "Programa",
];

const INDUSTRIES = [
  "AgriTech", "BioTech", "CleanTech", "ClimaTech", "ConstructionTech",
  "EdTech", "EnergyTech", "FinTech", "FoodTech", "GovTech", "HealthTech",
  "HRTech", "InsureTech", "LegalTech", "LogisticsTech", "ManufacturingTech",
  "MarketingTech", "MediaTech", "MobilityTech", "PropTech", "RetailTech",
  "SpaceTech", "SportTech", "TravelTech", "WasteTech", "Otro",
];

const TICKET_SIZES = [
  "US$10K–50K", "US$50K–100K", "US$100K–300K", "US$300K–500K",
  "US$500K–1M", "US$1M–3M", "US$3M–5M", "US$5M+",
];

interface Props {
  onSuccess: () => void;
}

export function ApplicationForm({ onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [referralCount, setReferralCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    getValues,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    mode: "onBlur",
    defaultValues: (() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      }
      return {
        startup_countries_expansion: [],
        startup_industries: [],
        round_tickets: [],
        has_referrals: "No",
        prior_fundraising: "No (esta sería nuestra primera ronda)",
        round_open: "Sí",
        program_source: "",
        ias_interested: undefined,
        accept_legal_terms: undefined,
      };
    })(),
  });

  // Persist to localStorage on every change
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const hasReferrals = watch("has_referrals");
  const priorFundraising = watch("prior_fundraising");
  const businessModel = watch("business_model");
  const industries = watch("startup_industries");

  const stepFields: Record<number, (keyof ApplicationFormData)[]> = {
    1: ["first_name", "last_name", "email", "whatsapp", "linkedin_founder", "founder_role", "country_residence"],
    2: ["startup_name", "startup_website", "startup_linkedin", "startup_country_ops", "startup_countries_expansion", "startup_description", "startup_industries", "business_model", "startup_stage", "founder_team_women", "startup_usa_intl", "startup_team_size"],
    3: ["startup_mrr", "startup_sales_12m"],
    4: ["prior_fundraising"],
    5: ["round_open", "round_series", "round_size", "round_tickets", "runway"],
    6: ["deck_url"],
    7: ["has_referrals"],
    8: ["program_source", "ias_interested", "accept_legal_terms"],
  };

  async function nextStep() {
    const fields = stepFields[step];
    const valid = await trigger(fields);
    if (valid) {
      const nextStepNum = Math.min(step + 1, TOTAL_STEPS);
      clearErrors(stepFields[nextStepNum]);
      setStep(nextStepNum);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function uploadLogo(file: File): Promise<string> {
    setUploadingLogo(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploadingLogo(false);
    return data.url;
  }

  async function onSubmit(data: ApplicationFormData) {
    setSubmitting(true);
    try {
      let logoUrl = data.startup_logo_url ?? "";
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, startup_logo_url: logoUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === "DUPLICATE_EMAIL") {
          toast.error("Ya existe una postulación con este email.");
        } else {
          toast.error("Error al enviar. Por favor intenta nuevamente.");
        }
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      onSuccess();
    } catch {
      toast.error("Error de conexión. Por favor intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const errorClass = "border-red-300 focus:ring-red-400";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      <FormProgress currentStep={step} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />

      {/* ── Sección 1: Founder ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Datos del Founder</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Nombre" required error={errors.first_name?.message}>
              <Input {...register("first_name")} placeholder="Gabriel" className={errors.first_name ? errorClass : ""} />
            </FieldWrapper>
            <FieldWrapper label="Apellido" required error={errors.last_name?.message}>
              <Input {...register("last_name")} placeholder="Neuman" className={errors.last_name ? errorClass : ""} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Email" required error={errors.email?.message}>
            <Input {...register("email")} type="email" placeholder="tu@startup.com" className={errors.email ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="Número de WhatsApp (con código de país)" required error={errors.whatsapp?.message} help="Ejemplo: +56912345678">
            <Input {...register("whatsapp")} placeholder="+56912345678" className={errors.whatsapp ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="URL de tu LinkedIn" required error={errors.linkedin_founder?.message}>
            <Input {...register("linkedin_founder")} placeholder="https://linkedin.com/in/..." className={errors.linkedin_founder ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="Rol en la startup" required error={errors.founder_role?.message}>
            <Controller
              name="founder_role"
              control={control}
              render={({ field }) => (
                <select {...field} className={`${inputClass} ${errors.founder_role ? errorClass : ""}`}>
                  <option value="">Selecciona tu rol</option>
                  {["CEO", "CTO", "COO", "CMO", "CFO", "Co-founder", "Otro"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            />
          </FieldWrapper>
          <FieldWrapper label="País de residencia" required error={errors.country_residence?.message}>
            <Controller
              name="country_residence"
              control={control}
              render={({ field }) => (
                <select {...field} className={`${inputClass} ${errors.country_residence ? errorClass : ""}`}>
                  <option value="">Selecciona tu país</option>
                  {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            />
          </FieldWrapper>
        </div>
      )}

      {/* ── Sección 2: Startup ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Datos de la Startup</h2>
          <FieldWrapper label="Nombre de la startup" required error={errors.startup_name?.message}>
            <Input {...register("startup_name")} placeholder="Mi Startup" className={errors.startup_name ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="Website de la startup" required error={errors.startup_website?.message} help="Incluir https://">
            <Input {...register("startup_website")} placeholder="https://miastartup.com" className={errors.startup_website ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="LinkedIn de la startup" required error={errors.startup_linkedin?.message}>
            <Input {...register("startup_linkedin")} placeholder="https://linkedin.com/company/..." className={errors.startup_linkedin ? errorClass : ""} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="País principal de operaciones" required error={errors.startup_country_ops?.message} help="Donde está tu centro de operaciones">
              <Controller
                name="startup_country_ops"
                control={control}
                render={({ field }) => (
                  <select {...field} className={`${inputClass} ${errors.startup_country_ops ? errorClass : ""}`}>
                    <option value="">Selecciona</option>
                    {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              />
            </FieldWrapper>
            <FieldWrapper label="Tamaño equipo full-time" required error={errors.startup_team_size?.message}>
              <Input {...register("startup_team_size")} type="number" min="1" placeholder="5" className={errors.startup_team_size ? errorClass : ""} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Países donde operan o quieren operar (18 meses)" required error={errors.startup_countries_expansion?.message} help="Selecciona todos los que apliquen">
            <Controller
              name="startup_countries_expansion"
              control={control}
              render={({ field }) => (
                <MultiSelect options={ALL_COUNTRIES} value={field.value ?? []} onChange={field.onChange} error={errors.startup_countries_expansion?.message} />
              )}
            />
          </FieldWrapper>
          <FieldWrapper label="Describe tu startup en 1–2 frases" required error={errors.startup_description?.message}>
            <Controller
              name="startup_description"
              control={control}
              render={({ field }) => {
                const len = field.value?.length ?? 0;
                return (
                  <div>
                    <Textarea {...field} placeholder="¿Qué problema resuelven y para quién?" maxLength={300} rows={3} className={errors.startup_description ? errorClass : ""} />
                    <p className="text-xs text-zinc-400 text-right mt-1">{len}/300</p>
                  </div>
                );
              }}
            />
          </FieldWrapper>
          <FieldWrapper label="Verticales / industria" required error={errors.startup_industries?.message} help="Selecciona todas las que apliquen">
            <Controller
              name="startup_industries"
              control={control}
              render={({ field }) => (
                <MultiSelect options={INDUSTRIES} value={field.value ?? []} onChange={field.onChange} error={errors.startup_industries?.message} />
              )}
            />
          </FieldWrapper>
          {industries?.includes("Otro") && (
            <FieldWrapper label="Especifica la vertical" required error={errors.startup_industry_other?.message}>
              <Input {...register("startup_industry_other")} maxLength={50} placeholder="Tu industria" />
            </FieldWrapper>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Modelo de negocio" required error={errors.business_model?.message}>
              <Controller
                name="business_model"
                control={control}
                render={({ field }) => (
                  <select {...field} className={`${inputClass} ${errors.business_model ? errorClass : ""}`}>
                    <option value="">Selecciona</option>
                    {["B2B", "B2C", "B2B2C", "Marketplace", "SaaS", "Otro"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              />
            </FieldWrapper>
            <FieldWrapper label="Etapa de la startup" required error={errors.startup_stage?.message}>
              <Controller
                name="startup_stage"
                control={control}
                render={({ field }) => (
                  <select {...field} className={`${inputClass} ${errors.startup_stage ? errorClass : ""}`}>
                    <option value="">Selecciona</option>
                    {["Idea / Patent", "Prototype / MVP", "Early Revenue / Product Market-Fit", "Scaling / Go-To-Market", "Growth / Expansion"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              />
            </FieldWrapper>
          </div>
          {businessModel === "Otro" && (
            <FieldWrapper label="Especifica el modelo" required error={errors.business_model_other?.message}>
              <Input {...register("business_model_other")} maxLength={50} placeholder="Tu modelo de negocio" />
            </FieldWrapper>
          )}
          <FieldWrapper label="¿Hay al menos una mujer en el founding team?" required error={errors.founder_team_women?.message}>
            <div className="flex gap-4">
              {["Sí", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("founder_team_women")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>
          <FieldWrapper label="¿Tienen intención de internacionalizarse a USA en los próximos 18 meses?" required error={errors.startup_usa_intl?.message}>
            <div className="flex gap-4 flex-wrap">
              {["Sí", "No", "Ya operamos en USA"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("startup_usa_intl")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>
        </div>
      )}

      {/* ── Sección 3: Tracción ────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Tracción</h2>
          <FieldWrapper label="MRR actual (USD)" required error={errors.startup_mrr?.message} help="Monthly Recurring Revenue. Si no tienes modelo recurrente, pon 0.">
            <Input {...register("startup_mrr")} type="number" min="0" placeholder="0" className={errors.startup_mrr ? errorClass : ""} />
          </FieldWrapper>
          <FieldWrapper label="Ventas / facturación últimos 12 meses (USD)" required error={errors.startup_sales_12m?.message} help="Suma total de ventas de los últimos 12 meses">
            <Input {...register("startup_sales_12m")} type="number" min="0" placeholder="0" className={errors.startup_sales_12m ? errorClass : ""} />
          </FieldWrapper>
        </div>
      )}

      {/* ── Sección 4: Capital ─────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Historial de Capital</h2>
          <FieldWrapper label="¿Han levantado capital anteriormente?" required error={errors.prior_fundraising?.message}>
            <div className="flex gap-4 flex-wrap">
              {["Sí", "No (esta sería nuestra primera ronda)"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("prior_fundraising")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>
          {priorFundraising === "Sí" && (
            <FieldWrapper label="¿Cuánto han levantado en total hasta hoy? (USD)" required error={errors.prior_fundraising_amount?.message} help="Suma de todas las rondas previas (FFF, ángeles, pre-seed, seed, etc.)">
              <Input {...register("prior_fundraising_amount")} type="number" min="0" placeholder="500000" className={errors.prior_fundraising_amount ? errorClass : ""} />
            </FieldWrapper>
          )}
        </div>
      )}

      {/* ── Sección 5: Ronda ──────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Ronda Actual</h2>
          <FieldWrapper label="¿Están levantando ronda actualmente?" required error={errors.round_open?.message}>
            <div className="flex gap-4 flex-wrap">
              {["Sí", "No (pero la iniciaremos en los próximos 12 meses)"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("round_open")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Tipo de ronda" required error={errors.round_series?.message}>
              <Controller
                name="round_series"
                control={control}
                render={({ field }) => (
                  <select {...field} className={`${inputClass} ${errors.round_series ? errorClass : ""}`}>
                    <option value="">Selecciona</option>
                    {["Pre-Seed", "Seed", "Post-Seed", "Pre-Series A", "Series A", "Series B", "Series C+"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              />
            </FieldWrapper>
            <FieldWrapper label="Tamaño objetivo de la ronda (USD)" required error={errors.round_size?.message} help="Monto total que buscan levantar">
              <Input {...register("round_size")} type="number" min="0" placeholder="1000000" className={errors.round_size ? errorClass : ""} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Rango de ticket que buscan" required error={errors.round_tickets?.message} help="Ticket por inversor, no monto total">
            <Controller
              name="round_tickets"
              control={control}
              render={({ field }) => (
                <MultiSelect options={TICKET_SIZES} value={field.value ?? []} onChange={field.onChange} error={errors.round_tickets?.message} />
              )}
            />
          </FieldWrapper>
          <FieldWrapper label="Runway actual (meses)" required error={errors.runway?.message} help="Cuántos meses pueden operar con la caja actual">
            <Input {...register("runway")} type="number" min="0" placeholder="12" className={errors.runway ? errorClass : ""} />
          </FieldWrapper>
        </div>
      )}

      {/* ── Sección 6: Deck ───────────────────────────────────────────────── */}
      {step === 6 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Pitch Deck</h2>
          <FieldWrapper label="Link a tu Pitch Deck" required error={errors.deck_url?.message} help="Google Drive, Dropbox, Notion o similar. Asegúrate que el link tenga permisos abiertos para ver.">
            <Input {...register("deck_url")} placeholder="https://drive.google.com/..." className={errors.deck_url ? errorClass : ""} />
          </FieldWrapper>
        </div>
      )}

      {/* ── Sección 7: Recomendadores ─────────────────────────────────────── */}
      {step === 7 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Recomendadores</h2>
          <FieldWrapper label="¿Tienes código de referido? (opcional)" help="Ejemplo: ALUMNIMF. Descuentos aplicados post-admisión.">
            <Input {...register("referral_code")} placeholder="ALUMNIMF" className="uppercase" />
          </FieldWrapper>
          <FieldWrapper label="¿Quieres sumar recomendadores a tu postulación?" required help="Suma puntos al perfil">
            <div className="flex gap-4">
              {["Sí", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("has_referrals")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>

          {hasReferrals === "Sí" && (
            <div className="space-y-6">
              {[1, 2, 3].slice(0, referralCount).map((n) => (
                <div key={n} className="border border-zinc-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-700">Recomendador {n}</h3>
                    {n > 1 && n === referralCount && (
                      <button type="button" onClick={() => setReferralCount((c) => c - 1)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldWrapper label="Nombre" required={n === 1}>
                      <Input {...register(`referral_${n}_name` as keyof ApplicationFormData)} placeholder="Nombre" />
                    </FieldWrapper>
                    <FieldWrapper label="Apellido" required={n === 1}>
                      <Input {...register(`referral_${n}_lastname` as keyof ApplicationFormData)} placeholder="Apellido" />
                    </FieldWrapper>
                  </div>
                  <FieldWrapper label="Email" required={n === 1}>
                    <Input {...register(`referral_${n}_email` as keyof ApplicationFormData)} type="email" placeholder="recomendador@email.com" />
                  </FieldWrapper>
                  <FieldWrapper label="LinkedIn" required={n === 1}>
                    <Input {...register(`referral_${n}_linkedin` as keyof ApplicationFormData)} placeholder="https://linkedin.com/in/..." />
                  </FieldWrapper>
                  <FieldWrapper label="¿Quién es y cómo lo conoces?" required={n === 1}>
                    <Textarea {...register(`referral_${n}_relation` as keyof ApplicationFormData)} placeholder="Describe tu relación..." maxLength={200} rows={2} />
                  </FieldWrapper>
                </div>
              ))}
              {referralCount < 3 && (
                <button
                  type="button"
                  onClick={() => setReferralCount((c) => c + 1)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" /> Agregar otro recomendador
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sección 8: Programa ───────────────────────────────────────────── */}
      {step === 8 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-zinc-800 mb-6">Programa</h2>
          <FieldWrapper label="¿Cómo supiste de Modo Fundraising 2026?" required error={errors.program_source?.message}>
            <Controller
              name="program_source"
              control={control}
              render={({ field }) => (
                <select {...field} className={`${inputClass} ${errors.program_source ? errorClass : ""}`}>
                  <option value="">Selecciona</option>
                  {["Redes sociales", "Recomendación personal", "Ambassador", "Newsletter", "Evento", "Prensa / medios", "Otro"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            />
          </FieldWrapper>
          <FieldWrapper
            label="¿Quieres ser considerado para IAS — sesiones pagadas 1:1 con mentor?"
            required
            error={errors.ias_interested?.message}
            help="Sesiones de 30 min semanales con mentor especializado del equipo de Impacta VC. Detalle y costo se comparte post-admisión."
          >
            <div className="flex gap-4">
              {["Sí", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register("ias_interested")} value={opt} className="accent-blue-600" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </FieldWrapper>

          <FieldWrapper label="Logo de tu startup" error={errors.startup_logo_url?.message} help="PNG, JPG o SVG. Máx 5MB. Preferible fondo transparente.">
            <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center">
              {logoFile ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-zinc-600">{logoFile.name}</span>
                  <button type="button" onClick={() => setLogoFile(null)} className="text-red-500 text-xs">Eliminar</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <span className="text-sm text-zinc-500">Arrastra tu logo aquí o <span className="text-blue-600 font-medium">haz clic para seleccionar</span></span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size <= 5 * 1024 * 1024) {
                        setLogoFile(file);
                      } else if (file) {
                        toast.error("El archivo excede 5MB");
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </FieldWrapper>

          <FieldWrapper label="" error={errors.accept_legal_terms?.message}>
            <Controller
              name="accept_legal_terms"
              control={control}
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    id="legal"
                    className="mt-0.5"
                  />
                  <label htmlFor="legal" className="text-sm text-zinc-600 cursor-pointer">
                    He leído y acepto las{" "}
                    <a
                      href="/bases-legales"
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      Bases Legales de Modo Fundraising 2026
                    </a>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                </div>
              )}
            />
          </FieldWrapper>
        </div>
      )}

      {/* ── Navegación ────────────────────────────────────────────────────── */}
      <div className="flex justify-between mt-8 pt-6 border-t border-zinc-100">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        ) : <div />}

        {step < TOTAL_STEPS ? (
          <Button type="button" onClick={nextStep} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={submitting || uploadingLogo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Enviar postulación 🚀"}
          </Button>
        )}
      </div>
    </form>
  );
}
