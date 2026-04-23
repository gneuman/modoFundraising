import { z } from "zod";

const phoneRegex = /^\+[1-9]\d{7,14}$/;
const linkedinRegex = /linkedin\.com/i;

export const applicationSchema = z.object({
  // S1 — Founder
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  email: z.string().email(),
  whatsapp: z.string().regex(phoneRegex, "Formato: +56912345678"),
  linkedin_founder: z.string().url().regex(linkedinRegex, "Debe ser LinkedIn"),
  founder_role: z.string().min(1),
  country_residence: z.string().min(1),

  // S2 — Startup
  startup_name: z.string().max(80),
  startup_website: z.string().url("URL válida, incluir https://"),
  startup_linkedin: z.string().url().regex(linkedinRegex, "Debe ser LinkedIn"),
  startup_country_ops: z.string().min(1),
  startup_countries_expansion: z.array(z.string()).min(1),
  startup_description: z.string().max(300),
  startup_industries: z.array(z.string()).min(1),
  startup_industry_other: z.string().max(50).optional(),
  business_model: z.string().min(1),
  business_model_other: z.string().max(50).optional(),
  startup_stage: z.string().min(1),
  founder_team_women: z.enum(["Sí", "No"]),
  startup_usa_intl: z.enum(["Sí", "No", "Ya operamos en USA"]),
  startup_team_size: z.coerce.number().int().min(1),

  // S3 — Tracción
  startup_mrr: z.coerce.number().int().min(0),
  startup_sales_12m: z.coerce.number().int().min(0),

  // S4 — Capital
  prior_fundraising: z.enum(["Sí", "No (esta sería nuestra primera ronda)"]),
  prior_fundraising_amount: z.coerce.number().int().min(0).optional(),

  // S5 — Ronda
  round_open: z.enum(["Sí", "No (pero la iniciaremos en los próximos 12 meses)"]),
  round_series: z.string().min(1),
  round_size: z.coerce.number().int().min(0),
  round_tickets: z.array(z.string()).min(1),
  runway: z.coerce.number().int().min(0),

  // S6 — Deck
  deck_url: z.string().url(),

  // S7 — Recomendadores
  referral_code: z.string().optional(),
  has_referrals: z.enum(["Sí", "No"]),
  referral_1_name: z.string().optional(),
  referral_1_lastname: z.string().optional(),
  referral_1_email: z.string().email().optional().or(z.literal("")),
  referral_1_linkedin: z.string().url().regex(linkedinRegex).optional().or(z.literal("")),
  referral_1_relation: z.string().max(200).optional(),
  referral_2_name: z.string().optional(),
  referral_2_lastname: z.string().optional(),
  referral_2_email: z.string().email().optional().or(z.literal("")),
  referral_2_linkedin: z.string().url().regex(linkedinRegex).optional().or(z.literal("")),
  referral_2_relation: z.string().max(200).optional(),
  referral_3_name: z.string().optional(),
  referral_3_lastname: z.string().optional(),
  referral_3_email: z.string().email().optional().or(z.literal("")),
  referral_3_linkedin: z.string().url().regex(linkedinRegex).optional().or(z.literal("")),
  referral_3_relation: z.string().max(200).optional(),

  // S8 — Programa
  program_source: z.string().min(1),
  ias_interested: z.enum(["Sí", "No"]),
  startup_logo_url: z.string().optional(),
  accept_legal_terms: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar las bases legales" }),
  }),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
