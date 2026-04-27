"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronRight, Loader2, SkipForward } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "./multi-select";
import { ChatBubble } from "./chat-bubble";
import { applicationSchema, type ApplicationFormData } from "@/lib/form-schema";
import { ALL_COUNTRIES } from "@/lib/countries";

const STORAGE_KEY = "mf2026_chat";

const PHONE_CODES = [
  { code: "+56", label: "🇨🇱 +56 Chile" },
  { code: "+54", label: "🇦🇷 +54 Argentina" },
  { code: "+55", label: "🇧🇷 +55 Brasil" },
  { code: "+57", label: "🇨🇴 +57 Colombia" },
  { code: "+52", label: "🇲🇽 +52 México" },
  { code: "+51", label: "🇵🇪 +51 Perú" },
  { code: "+58", label: "🇻🇪 +58 Venezuela" },
  { code: "+593", label: "🇪🇨 +593 Ecuador" },
  { code: "+595", label: "🇵🇾 +595 Paraguay" },
  { code: "+598", label: "🇺🇾 +598 Uruguay" },
  { code: "+591", label: "🇧🇴 +591 Bolivia" },
  { code: "+1", label: "🇺🇸 +1 USA / Canadá" },
  { code: "+34", label: "🇪🇸 +34 España" },
  { code: "+44", label: "🇬🇧 +44 Reino Unido" },
  { code: "+49", label: "🇩🇪 +49 Alemania" },
  { code: "+33", label: "🇫🇷 +33 Francia" },
  { code: "+39", label: "🇮🇹 +39 Italia" },
  { code: "+972", label: "🇮🇱 +972 Israel" },
  { code: "+971", label: "🇦🇪 +971 Emiratos" },
  { code: "+65", label: "🇸🇬 +65 Singapur" },
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

type InternalKeys = "_add_ref_2" | "_add_ref_3";
type FormState = Partial<ApplicationFormData> & { [K in InternalKeys]?: "Sí" | "No" };

type QuestionType =
  | "text" | "email" | "tel" | "phone" | "number" | "url"
  | "textarea" | "select" | "radio" | "multiselect"
  | "file" | "checkbox";

interface Question {
  id: keyof ApplicationFormData | InternalKeys;
  text: string;
  type: QuestionType;
  options?: string[];
  help?: string;
  optional?: boolean;
  condition?: (d: FormState) => boolean;
}

const QUESTIONS: Question[] = [
  // S1 — Founder
  { id: "first_name", text: "¡Hola! Soy el asistente de postulación de Impacta VC.\n\n¿Cuál es tu nombre?", type: "text" },
  { id: "last_name", text: "¿Y tu apellido?", type: "text" },
  { id: "email", text: "¿Cuál es tu email de contacto?", type: "email" },
  { id: "whatsapp", text: "¿Cuál es tu número de WhatsApp?", type: "phone" },
  { id: "linkedin_founder", text: "¿URL de tu perfil de LinkedIn?", type: "url", help: "https://linkedin.com/in/..." },
  { id: "founder_role", text: "¿Cuál es tu rol en la startup?", type: "radio", options: ["CEO", "CTO", "COO", "CMO", "CFO", "Co-founder", "Otro"] },
  { id: "country_residence", text: "¿En qué país vives actualmente?", type: "select", options: ALL_COUNTRIES },

  // S2 — Startup
  { id: "startup_name", text: "¿Cómo se llama tu startup?", type: "text" },
  { id: "startup_website", text: "¿Cuál es el website de la startup?", type: "url", help: "Incluir https://" },
  { id: "startup_linkedin", text: "¿LinkedIn de la startup?", type: "url", help: "https://linkedin.com/company/..." },
  { id: "startup_country_ops", text: "¿Cuál es el país principal de operaciones?", type: "select", options: ALL_COUNTRIES },
  { id: "startup_countries_expansion", text: "¿En qué países operan o quieren operar en los próximos 18 meses?", type: "multiselect", options: ALL_COUNTRIES, help: "Selecciona todos los que apliquen" },
  { id: "startup_description", text: "Describe tu startup en 1–2 frases. ¿Qué problema resuelven y para quién?", type: "textarea" },
  { id: "startup_industries", text: "¿En qué verticales o industrias operan?", type: "multiselect", options: INDUSTRIES, help: "Selecciona todas las que apliquen" },
  { id: "startup_industry_other", text: "¿Cuál es la vertical? Especifica.", type: "text", optional: true, condition: (d) => Array.isArray(d.startup_industries) && d.startup_industries.includes("Otro") },
  { id: "business_model", text: "¿Cuál es el modelo de negocio?", type: "radio", options: ["B2B", "B2C", "B2B2C", "Marketplace", "SaaS", "Otro"] },
  { id: "business_model_other", text: "¿Cuál es el modelo? Especifica.", type: "text", optional: true, condition: (d) => d.business_model === "Otro" },
  { id: "startup_stage", text: "¿En qué etapa está la startup?", type: "radio", options: ["Idea / Patent", "Prototype / MVP", "Early Revenue / Product Market-Fit", "Scaling / Go-To-Market", "Growth / Expansion"] },
  { id: "founder_team_women", text: "¿Hay al menos una mujer en el founding team?", type: "radio", options: ["Sí", "No"] },
  { id: "startup_usa_intl", text: "¿Tienen intención de internacionalizarse a USA en los próximos 18 meses?", type: "radio", options: ["Sí", "No", "Ya operamos en USA"] },
  { id: "startup_team_size", text: "¿Cuántas personas son en el equipo full-time?", type: "number" },

  // S3 — Tracción
  { id: "startup_mrr", text: "¿Cuál es su MRR actual en USD?", type: "number", help: "Monthly Recurring Revenue. Si no tienen modelo recurrente, pongan 0." },
  { id: "startup_sales_12m", text: "¿Cuánto facturaron en los últimos 12 meses en USD?", type: "number", help: "Suma total de ventas" },

  // S4 — Capital
  { id: "prior_fundraising", text: "¿Han levantado capital anteriormente?", type: "radio", options: ["Sí", "No (esta sería nuestra primera ronda)"] },
  { id: "prior_fundraising_amount", text: "¿Cuánto han levantado en total hasta hoy (USD)?", type: "number", optional: true, condition: (d) => d.prior_fundraising === "Sí", help: "Suma de todas las rondas previas" },

  // S5 — Ronda
  { id: "round_open", text: "¿Están levantando ronda actualmente?", type: "radio", options: ["Sí", "No (pero la iniciaremos en los próximos 12 meses)"] },
  { id: "round_series", text: "¿Qué tipo de ronda es?", type: "radio", options: ["Pre-Seed", "Seed", "Post-Seed", "Pre-Series A", "Series A", "Series B", "Series C+"] },
  { id: "round_size", text: "¿Cuál es el tamaño objetivo de la ronda (USD)?", type: "number", help: "Monto total que buscan levantar" },
  { id: "startup_valuation", text: "¿Cuál es la valuación actual de tu startup (USD)?", type: "number", optional: true, help: "Pre-money. Si no tienen valuación definida, puedes saltarlo." },
  { id: "round_tickets", text: "¿Qué rango de ticket buscan por inversor?", type: "multiselect", options: TICKET_SIZES },
  { id: "runway", text: "¿Cuántos meses de runway tienen actualmente?", type: "number", help: "Meses que pueden operar con la caja actual" },

  // S6 — Deck
  { id: "deck_url", text: "Sube tu deck acá:", type: "url", help: "Google Drive, Dropbox, Notion. Asegúrate de que el link sea público." },

  // S7 — Recomendadores
  { id: "referral_code", text: "¿Tienes un código de referido? (opcional)", type: "text", optional: true, help: "Puedes saltarlo si no tienes." },
  { id: "has_referrals", text: "¿Quieres sumar recomendadores a tu postulación? Suma puntos al perfil.", type: "radio", options: ["Sí", "No"] },

  // Referral 1
  { id: "referral_1_name", text: "Nombre y apellido del primer recomendador", type: "text", optional: true, condition: (d) => d.has_referrals === "Sí" },
  { id: "referral_1_email", text: "Email del primer recomendador", type: "email", optional: true, condition: (d) => d.has_referrals === "Sí" },
  { id: "referral_1_linkedin", text: "LinkedIn del primer recomendador", type: "url", optional: true, condition: (d) => d.has_referrals === "Sí" },
  { id: "referral_1_relation", text: "¿Quién es y cómo lo conoces?", type: "textarea", optional: true, condition: (d) => d.has_referrals === "Sí" },
  { id: "_add_ref_2", text: "¿Quieres agregar otro recomendador?", type: "radio", options: ["Sí", "No"], condition: (d) => d.has_referrals === "Sí" },

  // Referral 2
  { id: "referral_2_name", text: "Nombre y apellido del segundo recomendador", type: "text", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" },
  { id: "referral_2_email", text: "Email del segundo recomendador", type: "email", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" },
  { id: "referral_2_linkedin", text: "LinkedIn del segundo recomendador", type: "url", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" },
  { id: "referral_2_relation", text: "¿Quién es y cómo lo conoces?", type: "textarea", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" },
  { id: "_add_ref_3", text: "¿Quieres agregar un tercer recomendador?", type: "radio", options: ["Sí", "No"], condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" },

  // Referral 3
  { id: "referral_3_name", text: "Nombre y apellido del tercer recomendador", type: "text", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" && d._add_ref_3 === "Sí" },
  { id: "referral_3_email", text: "Email del tercer recomendador", type: "email", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" && d._add_ref_3 === "Sí" },
  { id: "referral_3_linkedin", text: "LinkedIn del tercer recomendador", type: "url", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" && d._add_ref_3 === "Sí" },
  { id: "referral_3_relation", text: "¿Quién es y cómo lo conoces?", type: "textarea", optional: true, condition: (d) => d.has_referrals === "Sí" && d._add_ref_2 === "Sí" && d._add_ref_3 === "Sí" },

  // S8 — Programa
  { id: "program_source", text: "¿Cómo supiste de Modo Fundraising 2026?", type: "radio", options: ["Redes sociales", "Recomendación personal", "Ambassador", "Newsletter", "Evento", "Prensa / medios", "Otro"] },
  { id: "ias_interested", text: "¿Quieres ser considerado para IAS — sesiones 1:1 pagadas con mentor?", type: "radio", options: ["Sí", "No"], help: "Sesiones de 30 min semanales con mentor del equipo Impacta VC. Detalle y costo se comparte post-admisión." },
  { id: "startup_logo_url", text: "¿Quieres subir el logo de tu startup? (opcional)", type: "file", optional: true, help: "PNG, JPG o SVG. Máx 5MB. Preferible fondo transparente." },
  { id: "accept_legal_terms", text: "Último paso: lee y acepta las Bases Legales de Modo Fundraising 2026 para enviar tu postulación.", type: "checkbox" },
];

function validateField(q: Question, val: unknown): string | null {
  if (q.optional && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) return null;
  if ((q.id as string).startsWith("_")) return null;

  const shape = applicationSchema.shape as Record<string, z.ZodTypeAny>;
  const fieldSchema = shape[q.id as string];
  if (!fieldSchema) return null;

  const result = fieldSchema.safeParse(val);
  if (!result.success) return result.error?.errors?.[0]?.message ?? "Campo inválido";
  return null;
}

function getDefaultVal(q?: Question): unknown {
  if (!q) return "";
  if (q.type === "multiselect") return [];
  if (q.type === "checkbox") return false;
  return "";
}

function getDisplayText(q: Question, val: unknown, file?: File | null): string {
  if (q.type === "file") return file?.name ?? "—";
  if (q.type === "checkbox") return "✓ Acepto las Bases Legales";
  if (Array.isArray(val)) return (val as string[]).join(", ") || "—";
  if (val === undefined || val === null || val === "") return "—";
  return String(val);
}

function findNextQIdx(from: number, data: FormState): number {
  for (let i = from; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    if (!q.condition || q.condition(data)) return i;
  }
  return QUESTIONS.length;
}

interface Message {
  from: "bot" | "user";
  text: string;
}

interface Props {
  onSuccess: () => void;
}

export function ChatForm({ onSuccess }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [qIdx, setQIdx] = useState<number>(-1);
  const [formData, setFormData] = useState<FormState>({});
  const [inputVal, setInputVal] = useState<unknown>("");
  const [error, setError] = useState<string | null>(null);
  const [botTyping, setBotTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+56");
  const [phoneNum, setPhoneNum] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let savedData: FormState = {};
    let startIdx = 0;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        savedData = parsed.formData ?? {};
        startIdx = typeof parsed.qIdx === "number" ? parsed.qIdx : 0;
      } catch {
        // ignore corrupt data
      }
    }

    const firstIdx = findNextQIdx(startIdx, savedData);
    const initMessages: Message[] = [];

    if (startIdx > 0 && firstIdx < QUESTIONS.length) {
      initMessages.push({ from: "bot", text: "¡Bienvenido de nuevo! Retomamos tu postulación donde la dejaste." });
    }

    if (firstIdx < QUESTIONS.length) {
      initMessages.push({ from: "bot", text: QUESTIONS[firstIdx].text });
      const existing = savedData[QUESTIONS[firstIdx].id as keyof FormState];
      setInputVal(existing !== undefined ? existing : getDefaultVal(QUESTIONS[firstIdx]));
    }

    setFormData(savedData);
    setMessages(initMessages);
    setQIdx(firstIdx);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  function saveToStorage(data: FormState, idx: number) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData: data, qIdx: idx }));
  }

  async function handleNext(overrideVal?: unknown) {
    if (qIdx < 0 || qIdx >= QUESTIONS.length) return;

    const q = QUESTIONS[qIdx];
    const val = overrideVal !== undefined ? overrideVal : inputVal;

    const err = validateField(q, val);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    const storedVal = q.type === "file" ? "" : val;
    const newData: FormState = { ...formData, [q.id]: storedVal };
    setFormData(newData);
    saveToStorage(newData, qIdx + 1);

    const displayText = getDisplayText(q, val, logoFile);
    setMessages((prev) => [...prev, { from: "user", text: displayText }]);

    const nextIdx = findNextQIdx(qIdx + 1, newData);

    if (nextIdx >= QUESTIONS.length) {
      await submitForm(newData);
      return;
    }

    setBotTyping(true);
    setTimeout(() => {
      setBotTyping(false);
      setQIdx(nextIdx);
      const existing = newData[QUESTIONS[nextIdx].id as keyof FormState];
      setInputVal(existing !== undefined ? existing : getDefaultVal(QUESTIONS[nextIdx]));
      setMessages((prev) => [...prev, { from: "bot", text: QUESTIONS[nextIdx].text }]);
    }, 400);
  }

  function handleSkip() {
    const q = QUESTIONS[qIdx];
    if (!q?.optional) return;
    handleNext(q.type === "multiselect" ? [] : "");
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

  async function submitForm(data: FormState) {
    setSubmitting(true);
    try {
      let logoUrl = "";
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      // Strip internal navigation keys before submitting
      const { _add_ref_2: _r2, _add_ref_3: _r3, ...submitData } = data;
      void _r2; void _r3;

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitData, startup_logo_url: logoUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === "DUPLICATE_EMAIL") {
          toast.error("Ya existe una postulación con este email.");
        } else {
          toast.error("Error al enviar. Intenta nuevamente.");
        }
        setSubmitting(false);
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      onSuccess();
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.");
      setSubmitting(false);
    }
  }

  function renderInput() {
    if (qIdx < 0 || qIdx >= QUESTIONS.length) return null;
    const q = QUESTIONS[qIdx];

    const inputCls =
      "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/40";

    switch (q.type) {
      case "text":
      case "email":
      case "tel":
      case "url":
        return (
          <Input
            type={q.type === "tel" ? "text" : q.type}
            value={inputVal as string}
            onChange={(e) => { setInputVal(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
            placeholder={q.help ?? ""}
            className={inputCls}
            autoFocus
          />
        );

      case "phone":
        return (
          <div className="flex gap-2">
            <select
              value={phoneCode}
              onChange={(e) => {
                setPhoneCode(e.target.value);
                setInputVal(`${e.target.value}${phoneNum}`);
                setError(null);
              }}
              className="rounded-lg border border-white/20 bg-slate-800 text-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 w-44 flex-shrink-0"
            >
              {PHONE_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <Input
              type="text"
              value={phoneNum}
              onChange={(e) => {
                const num = e.target.value.replace(/\D/g, "");
                setPhoneNum(num);
                setInputVal(`${phoneCode}${num}`);
                setError(null);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
              placeholder="912345678"
              className={inputCls}
              autoFocus
            />
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            min="0"
            value={inputVal as string}
            onChange={(e) => { setInputVal(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
            className={inputCls}
            autoFocus
          />
        );

      case "textarea":
        return (
          <Textarea
            value={inputVal as string}
            onChange={(e) => { setInputVal(e.target.value); setError(null); }}
            rows={3}
            maxLength={q.id === "startup_description" ? 300 : (q.id as string).includes("relation") ? 200 : undefined}
            className={`${inputCls} resize-none`}
            autoFocus
          />
        );

      case "select":
        return (
          <select
            value={inputVal as string}
            onChange={(e) => { setInputVal(e.target.value); setError(null); }}
            className="w-full rounded-lg border border-white/20 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="">Selecciona una opción</option>
            {q.options?.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="flex flex-wrap gap-2">
            {q.options?.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleNext(opt)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-white/20 bg-white/10 text-white transition-all hover:border-[#e5007e]"
                style={{}}
                onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(135deg, #e5007e, #e217cf)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case "multiselect":
        return (
          <MultiSelect
            options={q.options ?? []}
            value={inputVal as string[]}
            onChange={(val) => { setInputVal(val); setError(null); }}
            error={error ?? undefined}
          />
        );

      case "file":
        return (
          <div className="border-2 border-dashed border-white/20 rounded-xl p-5 text-center">
            {logoFile ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-white/80">{logoFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setLogoFile(null); setInputVal(""); }}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <span className="text-sm text-white/60">
                  Arrastra tu logo aquí o{" "}
                  <span className="font-medium" style={{ color: "#e5007e" }}>haz clic para seleccionar</span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("El archivo excede 5MB");
                      return;
                    }
                    setLogoFile(file);
                    setInputVal(file.name);
                  }}
                />
              </label>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-start gap-3 py-1">
            <Checkbox
              checked={inputVal === true}
              onCheckedChange={(checked) => { setInputVal(checked === true); setError(null); }}
              id="legal"
            />
            <label htmlFor="legal" className="text-sm text-white/80 cursor-pointer leading-relaxed">
              He leído y acepto las{" "}
              <a href="/bases-legales" target="_blank" className="underline" style={{ color: "#e5007e" }}>
                Bases Legales de Modo Fundraising 2026
              </a>
              <span className="text-red-400 ml-1">*</span>
            </label>
          </div>
        );
    }
  }

  const currentQ = qIdx >= 0 && qIdx < QUESTIONS.length ? QUESTIONS[qIdx] : null;
  const isLastQ = qIdx === QUESTIONS.length - 1;
  const showNextBtn = currentQ?.type !== "radio";
  const progress = QUESTIONS.length > 0 ? Math.round((Math.max(0, qIdx) / QUESTIONS.length) * 100) : 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: "linear-gradient(135deg, #181b2f 0%, #1a0d2e 50%, #181b2f 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <Image src="/logo-mf.png" alt="Modo Fundraising 2026" width={120} height={36} className="object-contain" />
        <div className="text-right">
          <p className="text-xs text-white/40 mb-1">Progreso</p>
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #e5007e, #e217cf)" }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            from={msg.from}
            text={msg.text}
            showAvatar={msg.from === "bot" && (i === 0 || messages[i - 1]?.from !== "bot")}
          />
        ))}

        {botTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border-2" style={{ borderColor: "#e5007e" }}>
              <Image src="/ifsp/victor-lau.webp" alt="Impacta VC" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!submitting && currentQ && !botTyping && (
        <div className="flex-shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-sm px-4 py-4 space-y-3">
          {currentQ.help && currentQ.type !== "radio" && (
            <p className="text-xs text-white/40">{currentQ.help}</p>
          )}

          {renderInput()}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {showNextBtn && (
            <div className="flex justify-between items-center pt-1">
              {currentQ.optional ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
                >
                  <SkipForward className="h-3 w-3" /> Saltar
                </button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                onClick={() => handleNext()}
                disabled={uploadingLogo}
                className="text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #e5007e, #e217cf)" }}
              >
                {uploadingLogo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                ) : isLastQ ? (
                  "Enviar postulación 🚀"
                ) : (
                  <>Siguiente <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {submitting && (
        <div className="flex-shrink-0 border-t border-white/10 bg-black/20 px-4 py-6 text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
          <p className="text-sm text-white/60">Enviando tu postulación...</p>
        </div>
      )}
    </div>
  );
}
