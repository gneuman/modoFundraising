import Airtable from "airtable";

// Lazy: el cliente se crea solo cuando se llama, no al importar el módulo.
// Esto evita el error "API key is required" durante el build de Next.js.
function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}

export const Tables = {
  POSTULACIONES: "Postulaciones MF26",
  FOUNDERS: "Founders MF26",
  STARTUPS: "Startups MF26",
  PAGOS: "Pagos MF26",
  CUPONES: "Cupones MF26",
  CLASES: "Clases MF26",
  MISIONES: "Misiones MF26",
  TAREAS: "Tareas MF26",
  RECURSOS: "Recursos MF26",
  ASISTENCIAS: "Asistencias MF26",
  MISIONES_COMPLETADAS: "Misiones Completadas MF26",
  FEEDBACK: "Feedback MF26",
  EMAIL_TEMPLATES: "Email Templates MF26",
  AUTOMATION_RULES: "Automation Rules MF26",
  RECHAZOS: "Rechazos MF26",
  // CMS público
  HOME_METRICS: "home_metrics",
  HOME_TESTIMONIOS: "home_testimonios",
  HOME_CASOS_EXITO: "home_casos_exito",
  HOME_LOGOS_ALUMNI: "home_logos_alumni",
  HOME_LOGOS_PARTNERS: "home_logos_partners",
  ADVISORS: "advisors",
  MASTERCLASSES: "masterclasses",
  LIVE_INTERVIEWS: "live_interviews",
  HOUSE_RULES: "house_rules",
  ROCKSTARS: "rockstars",
  QA: "qa",
  DESIGN_TOKENS: "design_tokens",
  INSTRUCTORES: "instructores_mf26",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "Nueva postulación"
  | "En revisión"
  | "Admitida"
  | "Rechazada"
  | "Sin Respuesta"
  | "Rechazada por founder"
  | "Inscrita"
  | "Invitada institucional"
  | "Churn"
  | "Churn By Founder";

export type PaymentStatus =
  | "Pendiente"
  | "Cuota 1 pagada"
  | "Cuota 2 pagada"
  | "Cuota 3 pagada"
  | "Cuota 4 pagada"
  | "Sin respuesta"
  | "Rechazada por founder"
  | "Baja";

// Full form data coming from the application form
export interface ApplicationFormData {
  // Founder fields → go to Founders MF26
  first_name: string;
  last_name: string;
  email: string;
  whatsapp: string;
  linkedin_founder: string;
  founder_role: string;
  country_residence: string;
  founder_team_women: string;
  // Startup fields → go to Startups MF26
  startup_name: string;
  startup_website: string;
  startup_linkedin: string;
  startup_logo_url?: string;
  startup_country_ops: string;
  startup_countries_expansion: string[];
  startup_description: string;
  startup_industries: string[];
  startup_industry_other?: string;
  business_model: string;
  business_model_other?: string;
  startup_stage: string;
  startup_usa_intl: string;
  startup_team_size: number;
  startup_mrr: number;
  startup_sales_12m: number;
  prior_fundraising: string;
  prior_fundraising_amount?: number;
  round_open: string;
  round_series: string;
  round_size: number;
  startup_valuation?: number;
  round_tickets: string[];
  runway: number;
  deck_url: string;
  program_source: string;
  ias_interested: string;
  // Postulación-only fields → go to Postulaciones MF26
  referral_code?: string;
  has_referrals: string;
  referral_1_name?: string;
  referral_1_email?: string;
  referral_1_linkedin?: string;
  referral_1_relation?: string;
  referral_2_name?: string;
  referral_2_email?: string;
  referral_2_linkedin?: string;
  referral_2_relation?: string;
  referral_3_name?: string;
  referral_3_email?: string;
  referral_3_linkedin?: string;
  referral_3_relation?: string;
  accept_legal_terms: boolean;
}

// Postulacion record as stored in Airtable (operational fields only)
export interface PostulacionRecord {
  id?: string;
  id_postulacion?: string;
  status?: ApplicationStatus;
  created_at?: string;
  admission_score?: number;
  assigned_reviewer?: string;
  payment_status?: PaymentStatus;
  total_cuotas?: number;
  follow_up_1_sent?: boolean;
  follow_up_2_sent?: boolean;
  admitted_at?: string;
  follow_up_1_sent_at?: string;
  follow_up_2_sent_at?: string;
  coupon_code?: string;
  discount_percent?: number;
  stripe_coupon_id?: string;
  stripe_promotion_code_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  rejection_reason?: string;
  churn_reason?: string;
  portal_access?: boolean;
  referral_code?: string;
  has_referrals?: string;
  referral_1_name?: string;
  referral_1_email?: string;
  referral_1_linkedin?: string;
  referral_1_relation?: string;
  referral_2_name?: string;
  referral_2_email?: string;
  referral_2_linkedin?: string;
  referral_2_relation?: string;
  referral_3_name?: string;
  referral_3_email?: string;
  referral_3_linkedin?: string;
  referral_3_relation?: string;
  accept_legal_terms?: boolean;
  form_responses?: string;
  // Linked records (populated from lookups or joins in code)
  founder_record?: string[];
  startup_record?: string[];
  // Denormalized from Founders table
  email?: string;
  first_name?: string;
  last_name?: string;
  whatsapp?: string;
  linkedin_founder?: string;
  founder_role?: string;
  country_residence?: string;
  // Denormalized from Startups table
  startup_name?: string;
  startup_country_ops?: string;
  startup_stage?: string;
  startup_mrr?: number;
  startup_sales_12m?: number;
  startup_team_size?: number;
  startup_website?: string;
  startup_linkedin?: string;
  startup_description?: string;
  startup_industries?: string;
  startup_countries_expansion?: string;
  startup_usa_intl?: string;
  business_model?: string;
  prior_fundraising?: string;
  prior_fundraising_amount?: number;
  round_open?: string;
  round_series?: string;
  round_size?: number;
  round_tickets?: string;
  runway?: number;
  deck_url?: string;
  program_source?: string;
  ias_interested?: string;
  // Cobranza / pagos fallidos
  payment_failed_at?: string;
  payment_resolved_at?: string;
  payment_reminder_1_at?: string;
  payment_reminder_2_at?: string;
  payment_reminder_3_at?: string;
}

export type ApplicationRecord = PostulacionRecord;

export interface PagoRecord {
  id?: string;
  stripe_invoice_id?: string;
  email?: string;
  startup_name?: string;
  cuota?: number;
  amount?: number;
  status?: string;
  paid_at?: string;
  stripe_subscription_id?: string;
}

export interface FounderRecord {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  whatsapp?: string;
  linkedin_founder?: string;
  founder_role?: string;
  country_residence?: string;
  founder_team_women?: string;
  portal_access?: boolean;
  joined_at?: string;
  stripe_customer_id?: string;
}

export interface StartupRecord {
  id?: string;
  startup_name: string;
  startup_website?: string;
  startup_linkedin?: string;
  startup_logo_url?: string;
  startup_country_ops?: string;
  startup_countries_expansion?: string;
  startup_description?: string;
  startup_industries?: string;
  startup_industry_other?: string;
  business_model?: string;
  business_model_other?: string;
  startup_stage?: string;
  startup_usa_intl?: string;
  startup_team_size?: number;
  startup_mrr?: number;
  startup_sales_12m?: number;
  prior_fundraising?: string;
  prior_fundraising_amount?: number;
  round_open?: string;
  round_series?: string;
  round_size?: number;
  round_tickets?: string;
  startup_valuation?: number;
  runway?: number;
  deck_url?: string;
  program_source?: string;
  ias_interested?: string;
  status?: string;
  created_at?: string;
}

export interface CouponRecord {
  id?: string;
  code: string;
  discount_percent: number;
  stripe_coupon_id: string;
  stripe_promotion_code_id?: string;
  description?: string;
  used_count?: number;
  active: boolean;
}

// ─── Founders ─────────────────────────────────────────────────────────────────

export async function createFounderRecord(data: Pick<ApplicationFormData, 'email'> & Partial<ApplicationFormData>): Promise<string> {
  const fields: Record<string, unknown> = {
    email: data.email,
    portal_access: false,
    joined_at: new Date().toISOString(),
  };
  if (data.first_name) fields.first_name = data.first_name;
  if (data.last_name) fields.last_name = data.last_name;
  if (data.whatsapp) fields.whatsapp = data.whatsapp;
  if (data.linkedin_founder) fields.linkedin_founder = data.linkedin_founder;
  if (data.founder_role) fields.founder_role = data.founder_role;
  if (data.country_residence) fields.country_residence = data.country_residence;
  if (data.founder_team_women) fields.founder_team_women = data.founder_team_women;
  const record = await base(Tables.FOUNDERS).create(fields as never);
  return record.id;
}

// Devuelve todos los founders que tienen acceso al portal (incluyendo co-founders invitados)
export async function getAllFoundersWithAccess(): Promise<{ id: string; email: string; first_name: string; last_name: string }[]> {
  const records = await base(Tables.FOUNDERS)
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  return records
    .map((r) => {
      const f = r.fields as Record<string, unknown>;
      return {
        id: r.id,
        email: (f.email as string) ?? "",
        first_name: (f.first_name as string) ?? "",
        last_name: (f.last_name as string) ?? "",
      };
    })
    .filter((f) => f.email);
}

// Devuelve los emails de todos los founders activos de una startup dada
export async function getFounderEmailsByStartup(startupId: string): Promise<string[]> {
  const records = await base(Tables.FOUNDERS)
    .select({
      filterByFormula: `AND(SEARCH("${startupId}", ARRAYJOIN({Startups MF26})), {portal_access} = 1)`,
      fields: ["email"],
    })
    .all();
  return records.map((r) => (r.fields as Record<string, unknown>).email as string).filter(Boolean);
}

// Devuelve todos los calendar_event_id de las clases que tienen evento en Calendar
export async function getCalendarEventIds(): Promise<string[]> {
  const records = await base(Tables.CLASES)
    .select({ fields: ["calendar_event_id"], filterByFormula: `{calendar_event_id} != ""` })
    .all();
  return records
    .map((r) => (r.fields as Record<string, unknown>).calendar_event_id as string)
    .filter(Boolean);
}

export async function getFounderByEmail(email: string): Promise<FounderRecord | null> {
  const records = await base(Tables.FOUNDERS)
    .select({ filterByFormula: `{email} = "${email}"`, maxRecords: 1 })
    .firstPage();
  if (!records.length) return null;
  return { id: records[0].id, ...records[0].fields } as FounderRecord;
}

export interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  founder_role?: string;
  whatsapp?: string;
  linkedin_founder?: string;
  country_residence?: string;
  portal_access: boolean;
}

export interface FounderProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  whatsapp?: string;
  linkedin_founder?: string;
  founder_role?: string;
  country_residence?: string;
  founder_team_women?: string;
  portal_access: boolean;
  stripe_customer_id?: string;
  // from postulacion
  postulacion_id?: string;
  status?: ApplicationStatus;
  payment_status?: PaymentStatus;
  coupon_code?: string;
  stripe_coupon_id?: string;
  stripe_promotion_code_id?: string;
  stripe_subscription_id?: string;
  discount_percent?: number;
  // from startup
  startup_record_id?: string;
  startup_name?: string;
  startup_country_ops?: string;
  startup?: StartupRecord;
  team?: TeamMember[];
}

export async function getFounderProfile(email: string): Promise<FounderProfile | null> {
  const records = await base(Tables.FOUNDERS)
    .select({ filterByFormula: `{email} = "${email}"`, maxRecords: 1 })
    .firstPage();
  if (!records.length) return null;

  const f = records[0].fields as Record<string, unknown>;
  const profile: FounderProfile = {
    id: records[0].id,
    email: f.email as string ?? email,
    first_name: f.first_name as string ?? "",
    last_name: f.last_name as string ?? "",
    whatsapp: f.whatsapp as string | undefined,
    linkedin_founder: f.linkedin_founder as string | undefined,
    founder_role: f.founder_role as string | undefined,
    country_residence: f.country_residence as string | undefined,
    founder_team_women: f.founder_team_women as string | undefined,
    portal_access: f.portal_access as boolean ?? false,
    stripe_customer_id: f.stripe_customer_id as string | undefined,
  };

  const postulacionIds = f["Postulaciones MF26"] as string[] | undefined;

  if (postulacionIds?.length) {
    const postulacion = await base(Tables.POSTULACIONES).find(postulacionIds[0]);
    const pf = postulacion.fields as Record<string, unknown>;
    profile.postulacion_id = postulacion.id;
    profile.status = pf.status as ApplicationStatus | undefined;
    profile.payment_status = pf.payment_status as PaymentStatus | undefined;
    profile.coupon_code = pf.coupon_code as string | undefined;
    profile.stripe_coupon_id = pf.stripe_coupon_id as string | undefined;
    profile.stripe_promotion_code_id = pf.stripe_promotion_code_id as string | undefined;
    profile.stripe_subscription_id = pf.stripe_subscription_id as string | undefined;
    profile.discount_percent = pf.discount_percent as number | undefined;

    const startupIds = pf.startup_record as string[] | undefined;
    if (startupIds?.length) {
      const startup = await base(Tables.STARTUPS).find(startupIds[0]);
      const sf = startup.fields as Record<string, unknown>;
      profile.startup_record_id = startup.id;
      profile.startup_name = sf.startup_name as string | undefined;
      profile.startup_country_ops = sf.startup_country_ops as string | undefined;
      profile.startup = { id: startup.id, ...sf } as StartupRecord;

      // Fetch all founders linked to this startup
      const founderIds = sf["Founders"] as string[] | undefined;
      if (founderIds?.length) {
        const founderRecords = await Promise.all(founderIds.map((id) => base(Tables.FOUNDERS).find(id)));
        profile.team = founderRecords.map((r) => {
          const ff = r.fields as Record<string, unknown>;
          return {
            id: r.id,
            email: ff.email as string ?? "",
            first_name: ff.first_name as string ?? "",
            last_name: ff.last_name as string ?? "",
            founder_role: ff.founder_role as string | undefined,
            whatsapp: ff.whatsapp as string | undefined,
            linkedin_founder: ff.linkedin_founder as string | undefined,
            country_residence: ff.country_residence as string | undefined,
            portal_access: ff.portal_access as boolean ?? false,
          };
        });
      }
    }
  }

  // Fallback: if no startup found via postulación, check Startups MF26 linked directly
  if (!profile.startup) {
    const directStartupIds = f["Startups MF26"] as string[] | undefined;
    if (directStartupIds?.length) {
      const startup = await base(Tables.STARTUPS).find(directStartupIds[0]);
      const sf = startup.fields as Record<string, unknown>;
      profile.startup_record_id = startup.id;
      profile.startup_name = sf.startup_name as string | undefined;
      profile.startup_country_ops = sf.startup_country_ops as string | undefined;
      profile.startup = { id: startup.id, ...sf } as StartupRecord;

      const founderIds = sf["Founders"] as string[] | undefined;
      if (founderIds?.length) {
        const founderRecords = await Promise.all(founderIds.map((id) => base(Tables.FOUNDERS).find(id)));
        profile.team = founderRecords.map((r) => {
          const ff = r.fields as Record<string, unknown>;
          return {
            id: r.id,
            email: ff.email as string ?? "",
            first_name: ff.first_name as string ?? "",
            last_name: ff.last_name as string ?? "",
            founder_role: ff.founder_role as string | undefined,
            whatsapp: ff.whatsapp as string | undefined,
            linkedin_founder: ff.linkedin_founder as string | undefined,
            country_residence: ff.country_residence as string | undefined,
            portal_access: ff.portal_access as boolean ?? false,
          };
        });
      }
    }
  }

  return profile;
}

export async function updateFounder(id: string, data: Partial<FounderRecord> | Partial<ApplicationFormData>) {
  const FOUNDER_FIELDS = ['first_name', 'last_name', 'whatsapp', 'linkedin_founder', 'founder_role', 'country_residence', 'founder_team_women'];
  const fields: Record<string, unknown> = {};
  for (const key of FOUNDER_FIELDS) {
    const val = (data as Record<string, unknown>)[key];
    if (val !== undefined) fields[key] = val;
  }
  if (Object.keys(fields).length === 0) return;
  await base(Tables.FOUNDERS).update(id, fields as never);
}

export async function updateFounderAccess(
  founderRecordId: string,
  access: boolean,
  stripeCustomerId?: string
) {
  const fields: Record<string, unknown> = { portal_access: access };
  if (stripeCustomerId) fields.stripe_customer_id = stripeCustomerId;
  await base(Tables.FOUNDERS).update(founderRecordId, fields as never);
}

// Returns all founder record IDs linked to a postulacion
export async function getFounderIdsByPostulacion(postulacionId: string): Promise<string[]> {
  const record = await base(Tables.POSTULACIONES).find(postulacionId);
  const fields = record.fields as Record<string, unknown>;
  return (fields.founder_record as string[]) ?? [];
}

// Deactivates portal access for every founder (main + team) linked to a postulacion
export async function deactivateAllFoundersForApplication(postulacionId: string): Promise<void> {
  const founderIds = await getFounderIdsByPostulacion(postulacionId);
  await Promise.all(founderIds.map((id) => updateFounderAccess(id, false)));
}

// Activates portal access for every founder (main + team) linked to a postulacion
export async function activateAllFoundersForApplication(
  postulacionId: string,
  stripeCustomerId?: string
): Promise<void> {
  const founderIds = await getFounderIdsByPostulacion(postulacionId);
  await Promise.all(
    founderIds.map((id, i) =>
      updateFounderAccess(id, true, i === 0 ? stripeCustomerId : undefined)
    )
  );
}

// ─── Startups ─────────────────────────────────────────────────────────────────

export async function createStartupRecord(data: Pick<ApplicationFormData, 'startup_name'> & Partial<ApplicationFormData>, founderRecordId: string): Promise<string> {
  const fields: Record<string, unknown> = {
    startup_name: data.startup_name,
    status: "Postulada",
    created_at: new Date().toISOString(),
    Founders: [founderRecordId],
  };
  if (data.startup_website) fields.startup_website = data.startup_website;
  if (data.startup_linkedin) fields.startup_linkedin = data.startup_linkedin;
  if (data.startup_country_ops) fields.startup_country_ops = data.startup_country_ops;
  if (data.startup_countries_expansion) fields.startup_countries_expansion = Array.isArray(data.startup_countries_expansion) ? data.startup_countries_expansion.join(", ") : data.startup_countries_expansion;
  if (data.startup_description) fields.startup_description = data.startup_description;
  if (data.startup_industries) fields.startup_industries = Array.isArray(data.startup_industries) ? data.startup_industries.join(", ") : data.startup_industries;
  if (data.startup_industry_other) fields.startup_industry_other = data.startup_industry_other;
  if (data.business_model) fields.business_model = data.business_model;
  if (data.business_model_other) fields.business_model_other = data.business_model_other;
  if (data.startup_stage) fields.startup_stage = data.startup_stage;
  if (data.startup_usa_intl) fields.startup_usa_intl = data.startup_usa_intl;
  if (data.startup_team_size) fields.startup_team_size = data.startup_team_size;
  if (data.startup_mrr !== undefined) fields.startup_mrr = data.startup_mrr;
  if (data.startup_sales_12m !== undefined) fields.startup_sales_12m = data.startup_sales_12m;
  if (data.prior_fundraising) fields.prior_fundraising = data.prior_fundraising;
  if (data.prior_fundraising_amount !== undefined) fields.prior_fundraising_amount = data.prior_fundraising_amount;
  if (data.round_open) fields.round_open = data.round_open;
  if (data.round_series) fields.round_series = data.round_series;
  if (data.round_size !== undefined) fields.round_size = data.round_size;
  if (data.round_tickets) fields.round_tickets = Array.isArray(data.round_tickets) ? data.round_tickets.join(", ") : data.round_tickets;
  if (data.startup_valuation !== undefined) fields.startup_valuation = data.startup_valuation;
  if (data.runway !== undefined) fields.runway = data.runway;
  if (data.deck_url) fields.deck_url = data.deck_url;
  if (data.program_source) fields.program_source = data.program_source;
  if (data.ias_interested) fields.ias_interested = data.ias_interested;
  const record = await base(Tables.STARTUPS).create(fields as never);
  return record.id;
}

// Returns the Airtable record ID of the startup linked to a given founder, or null
export async function getStartupByFounderId(founderRecordId: string): Promise<string | null> {
  const records = await base(Tables.STARTUPS)
    .select({
      filterByFormula: `FIND("${founderRecordId}", ARRAYJOIN({Founders}))`,
      fields: ["startup_name"],
      maxRecords: 1,
    })
    .firstPage();
  return records.length ? records[0].id : null;
}

export async function getStartupById(id: string): Promise<StartupRecord | null> {
  try {
    const record = await base(Tables.STARTUPS).find(id);
    return { id: record.id, ...record.fields } as StartupRecord;
  } catch {
    return null;
  }
}

export async function updateStartup(id: string, data: Partial<StartupRecord> | Partial<ApplicationFormData>) {
  const STARTUP_FIELDS: (keyof StartupRecord)[] = [
    'startup_name', 'startup_website', 'startup_linkedin',
    'startup_country_ops', 'startup_countries_expansion', 'startup_description',
    'startup_industries', 'startup_industry_other', 'business_model', 'business_model_other',
    'startup_stage', 'startup_usa_intl', 'startup_team_size', 'startup_mrr',
    'startup_sales_12m', 'prior_fundraising', 'prior_fundraising_amount',
    'round_open', 'round_series', 'round_size', 'startup_valuation', 'round_tickets', 'runway',
    'deck_url', 'program_source', 'ias_interested',
  ];
  const ARRAY_TO_STRING = new Set(['startup_countries_expansion', 'startup_industries', 'round_tickets']);
  const NUM_FIELDS = new Set(['startup_team_size', 'startup_mrr', 'startup_sales_12m', 'prior_fundraising_amount', 'round_size', 'startup_valuation', 'runway']);
  const fields: Record<string, unknown> = {};
  for (const key of STARTUP_FIELDS) {
    const val = (data as Record<string, unknown>)[key];
    if (val === undefined || val === "") continue;
    if (ARRAY_TO_STRING.has(key)) { fields[key] = Array.isArray(val) ? val.join(", ") : val; }
    else if (NUM_FIELDS.has(key)) { const n = Number(val); if (!isNaN(n)) fields[key] = n; }
    else fields[key] = val;
  }
  if (Object.keys(fields).length === 0) return;
  await base(Tables.STARTUPS).update(id, fields as never);
}

export async function updateStartupStatus(startupRecordId: string, status: string) {
  await base(Tables.STARTUPS).update(startupRecordId, { status } as never);
}

export async function getAllStartups(): Promise<StartupRecord[]> {
  const records = await base(Tables.STARTUPS)
    .select({ sort: [{ field: "created_at", direction: "desc" }] })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields })) as StartupRecord[];
}

// ─── Postulaciones ────────────────────────────────────────────────────────────

// Find an in-progress postulacion linked to a founder (no status filter — status is empty during draft)
export async function getPostulacionByFounderId(founderRecordId: string): Promise<string | null> {
  const records = await base(Tables.POSTULACIONES)
    .select({
      filterByFormula: `AND(NOT({status}), FIND("${founderRecordId}", ARRAYJOIN({founder_record})))`,
      fields: ["founder_record"],
      maxRecords: 1,
    })
    .firstPage();
  return records.length ? records[0].id : null;
}

// Create a blank postulacion linked to founder (no status — set only on final submit)
export async function createDraftPostulacion(founderRecordId: string): Promise<string> {
  const record = await base(Tables.POSTULACIONES).create({
    created_at: new Date().toISOString(),
    payment_status: "Pendiente",
    portal_access: false,
    founder_record: [founderRecordId],
  } as never);
  return record.id;
}

// Update a draft postulacion with form data and links
export async function updateDraftPostulacion(
  postulacionId: string,
  formData: Record<string, unknown>,
  links?: { founderRecordId?: string; startupRecordId?: string }
): Promise<void> {
  const fields: Record<string, unknown> = {
    form_responses: JSON.stringify(formData, null, 2),
  };
  if (links?.founderRecordId) fields.founder_record = [links.founderRecordId];
  if (links?.startupRecordId) fields.startup_record = [links.startupRecordId];

  // Replicar campos de postulación (referrals + flags) en columnas individuales
  // para que sean filtrables en Airtable aun en estado borrador.
  const POSTULACION_FIELDS = [
    'referral_code', 'has_referrals',
    'referral_1_name', 'referral_1_email', 'referral_1_linkedin', 'referral_1_relation',
    'referral_2_name', 'referral_2_email', 'referral_2_linkedin', 'referral_2_relation',
    'referral_3_name', 'referral_3_email', 'referral_3_linkedin', 'referral_3_relation',
    'accept_legal_terms',
  ];
  for (const key of POSTULACION_FIELDS) {
    const val = formData[key];
    if (val !== undefined && val !== "") fields[key] = val;
  }

  await base(Tables.POSTULACIONES).update(postulacionId, fields as never);
}

export async function createApplication(
  data: ApplicationFormData,
  existingIds?: { founderRecordId?: string; startupRecordId?: string; postulacionRecordId?: string }
): Promise<{
  postulacionId: string;
  founderRecordId: string;
  startupRecordId: string;
}> {
  // Use IDs from draft if provided, otherwise resolve by email/founder
  let founderRecordId = existingIds?.founderRecordId ?? "";
  let startupRecordId = existingIds?.startupRecordId ?? "";

  if (!founderRecordId) {
    const existing = await getFounderByEmail(data.email);
    founderRecordId = existing?.id ?? await createFounderRecord(data);
  }
  if (!startupRecordId) {
    const existing = await getStartupByFounderId(founderRecordId);
    startupRecordId = existing ?? await createStartupRecord(data, founderRecordId);
  }

  // Update both records with final complete data
  await Promise.all([
    updateFounder(founderRecordId, data),
    updateStartup(startupRecordId, data),
  ]);

  const finalFields = {
    status: "Nueva postulación",
    accept_legal_terms: data.accept_legal_terms,
    form_responses: JSON.stringify(data, null, 2),
    referral_code: data.referral_code ?? "",
    has_referrals: data.has_referrals,
    referral_1_name: data.referral_1_name ?? "",
    referral_1_email: data.referral_1_email ?? "",
    referral_1_linkedin: data.referral_1_linkedin ?? "",
    referral_1_relation: data.referral_1_relation ?? "",
    referral_2_name: data.referral_2_name ?? "",
    referral_2_email: data.referral_2_email ?? "",
    referral_2_linkedin: data.referral_2_linkedin ?? "",
    referral_2_relation: data.referral_2_relation ?? "",
    referral_3_name: data.referral_3_name ?? "",
    referral_3_email: data.referral_3_email ?? "",
    referral_3_linkedin: data.referral_3_linkedin ?? "",
    referral_3_relation: data.referral_3_relation ?? "",
    founder_record: [founderRecordId],
    startup_record: [startupRecordId],
  };

  let postulacionId: string = existingIds?.postulacionRecordId ?? "";

  if (postulacionId) {
    // Draft postulacion already exists — just update with final data
    await base(Tables.POSTULACIONES).update(postulacionId, finalFields as never);
  } else {
    // No draft — create fresh
    const record = await base(Tables.POSTULACIONES).create({
      ...finalFields,
      created_at: new Date().toISOString(),
      payment_status: "Pendiente",
      portal_access: false,
    } as never);
    postulacionId = record.id;
  }

  return { postulacionId, founderRecordId, startupRecordId };
}

// Returns postulaciones enriched with founder+startup data for admin/portal use
export async function getAllApplications(): Promise<PostulacionRecord[]> {
  const [postulaciones, founders, startups] = await Promise.all([
    base(Tables.POSTULACIONES)
      .select({ sort: [{ field: "created_at", direction: "desc" }] })
      .all(),
    base(Tables.FOUNDERS).select().all(),
    base(Tables.STARTUPS).select().all(),
  ]);

  const founderMap = new Map(founders.map((f) => [f.id, f.fields]));
  const startupMap = new Map(startups.map((s) => [s.id, s.fields]));

  return postulaciones.map((p) => {
    const fields = p.fields as Record<string, unknown>;
    const founderIds = (fields.founder_record as string[]) ?? [];
    const startupIds = (fields.startup_record as string[]) ?? [];
    const founder = founderIds[0] ? founderMap.get(founderIds[0]) as Record<string, unknown> | undefined : undefined;
    const startup = startupIds[0] ? startupMap.get(startupIds[0]) as Record<string, unknown> | undefined : undefined;

    return {
      id: p.id,
      ...fields,
      // Denormalized de Founders
      email: founder?.email as string ?? "",
      first_name: founder?.first_name as string ?? "",
      last_name: founder?.last_name as string ?? "",
      whatsapp: founder?.whatsapp as string ?? "",
      linkedin_founder: founder?.linkedin_founder as string ?? "",
      founder_role: founder?.founder_role as string ?? "",
      country_residence: founder?.country_residence as string ?? "",
      // Denormalized de Startups
      startup_name: startup?.startup_name as string ?? "",
      startup_country_ops: startup?.startup_country_ops as string ?? "",
      startup_stage: startup?.startup_stage as string ?? "",
      startup_mrr: startup?.startup_mrr as number ?? 0,
      startup_sales_12m: startup?.startup_sales_12m as number ?? 0,
      startup_team_size: startup?.startup_team_size as number ?? 0,
      startup_website: startup?.startup_website as string ?? "",
      startup_linkedin: startup?.startup_linkedin as string ?? "",
      startup_description: startup?.startup_description as string ?? "",
      startup_industries: startup?.startup_industries as string ?? "",
      startup_countries_expansion: Array.isArray(startup?.startup_countries_expansion)
        ? (startup.startup_countries_expansion as string[]).join(", ")
        : startup?.startup_countries_expansion as string ?? "",
      startup_usa_intl: startup?.startup_usa_intl as string ?? "",
      business_model: startup?.business_model as string ?? "",
      prior_fundraising: startup?.prior_fundraising as string ?? "",
      prior_fundraising_amount: startup?.prior_fundraising_amount as number ?? 0,
      round_open: startup?.round_open as string ?? "",
      round_series: startup?.round_series as string ?? "",
      round_size: startup?.round_size as number ?? 0,
      round_tickets: Array.isArray(startup?.round_tickets)
        ? (startup.round_tickets as string[]).join(", ")
        : startup?.round_tickets as string ?? "",
      runway: startup?.runway as number ?? 0,
      deck_url: startup?.deck_url as string ?? "",
      program_source: startup?.program_source as string ?? "",
      ias_interested: startup?.ias_interested as string ?? "",
    } as PostulacionRecord;
  });
}

export async function getAllPagos(): Promise<PagoRecord[]> {
  const records = await base(Tables.PAGOS)
    .select({ sort: [{ field: "paid_at", direction: "desc" }] })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields })) as PagoRecord[];
}

export async function getApplicationByEmail(email: string): Promise<PostulacionRecord | null> {
  // Buscar postulaciones con status definido (no drafts) usando lookup directo del email
  const postulaciones = await base(Tables.POSTULACIONES)
    .select({
      filterByFormula: `AND({status}, {email (from founder_record)} = "${email}")`,
      fields: ["status", "created_at", "startup_record", "first_name (from founder_record)", "last_name (from founder_record)"],
      maxRecords: 1,
    })
    .firstPage();
  if (!postulaciones.length) return null;

  const post = postulaciones[0];
  const postFields = post.fields as Record<string, unknown>;
  // Lookup startup_name from the linked startup
  const startupIds = (postFields.startup_record as string[]) ?? [];
  let startupName = "";
  if (startupIds[0]) {
    try {
      const startup = await base(Tables.STARTUPS).find(startupIds[0]);
      startupName = (startup.fields as Record<string, unknown>).startup_name as string ?? "";
    } catch {
      // ignore
    }
  }

  const firstNameArr = postFields["first_name (from founder_record)"] as string[] | undefined;
  const lastNameArr = postFields["last_name (from founder_record)"] as string[] | undefined;

  return {
    id: post.id,
    email,
    status: postFields.status as ApplicationStatus,
    created_at: postFields.created_at as string,
    startup_name: startupName,
    first_name: firstNameArr?.[0] ?? "",
    last_name: lastNameArr?.[0] ?? "",
  } as PostulacionRecord;
}

export async function assignCouponToApplication(
  recordId: string,
  couponCode: string,
  discountPercent: number,
  stripeCouponId: string,
  stripePromotionCodeId?: string
) {
  const fields: Record<string, unknown> = {
    coupon_code: couponCode,
    discount_percent: discountPercent,
  };
  if (stripeCouponId) fields.stripe_coupon_id = stripeCouponId;
  if (stripePromotionCodeId) fields.stripe_promotion_code_id = stripePromotionCodeId;
  await base(Tables.POSTULACIONES).update(recordId, fields as never, { typecast: true });
}

export async function updateApplicationStatus(
  recordId: string,
  status: ApplicationStatus,
  extra?: Partial<PostulacionRecord>
) {
  const fields: Record<string, unknown> = { status, ...extra };
  await base(Tables.POSTULACIONES).update(recordId, fields as never, { typecast: true });
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

export async function createPagoRecord(data: {
  postulacionId: string;
  startupRecordId: string;
  email: string;
  startup_name: string;
  cuota: number;
  amount: number;
  stripe_invoice_id?: string;
  stripe_subscription_id?: string;
}) {
  await base(Tables.PAGOS).create({
    stripe_invoice_id: data.stripe_invoice_id ?? `manual-${Date.now()}`,
    email: data.email,
    startup_name: data.startup_name,
    cuota: data.cuota,
    amount: data.amount,
    status: "Pagado",
    stripe_subscription_id: data.stripe_subscription_id ?? "",
    paid_at: new Date().toISOString(),
    postulacion: [data.postulacionId],
    startup_record: [data.startupRecordId],
  } as never);
}

// ─── Cupones ──────────────────────────────────────────────────────────────────

export async function createCouponRecord(data: CouponRecord): Promise<string> {
  const record = await base(Tables.CUPONES).create({
    code: data.code,
    discount_percent: data.discount_percent,
    stripe_coupon_id: data.stripe_coupon_id,
    stripe_promotion_code_id: data.stripe_promotion_code_id ?? "",
    description: data.description ?? "",
    used_count: 0,
    active: true,
  } as never);
  return record.id;
}

export async function getAllCoupons(): Promise<CouponRecord[]> {
  const records = await base(Tables.CUPONES).select().all();
  return records.map((r) => ({ id: r.id, ...r.fields })) as CouponRecord[];
}

// ─── Clases ───────────────────────────────────────────────────────────────────

export interface ClaseRecord {
  id?: string;
  titulo?: string;
  descripcion?: string;
  semana?: number;
  fecha?: string;
  url_live?: string;
  url_grabacion?: string;
  meet_link?: string;
  calendar_event_id?: string;
  status?: "Próxima" | "En vivo" | "Grabada";
  Portada?: { url: string; thumbnails?: { large?: { url: string } } }[];
  // Inverse linked fields (auto-created by Airtable)
  misiones?: string[];
  recursos?: string[];
}

export interface ClaseInput {
  titulo: string;
  descripcion?: string;
  semana?: number;
  fecha?: string;
  url_live?: string;
  url_grabacion?: string;
  meet_link?: string;
  calendar_event_id?: string;
  status?: string;
}

export interface MisionInput {
  titulo: string;
  descripcion?: string;
  instrucciones?: string;
  semana?: number;
  dias_offset?: number;
  fecha_limite?: string;
  status?: string;
  claseId?: string;
}

export interface RecursoInput {
  titulo: string;
  url?: string;
  tipo?: string;
  descripcion?: string;
  dias_offset?: number;
  fecha_disponible?: string;
  claseId?: string;
}

export interface MisionRecord {
  id?: string;
  titulo?: string;
  descripcion?: string;
  instrucciones?: string;
  semana?: number;
  dias_offset?: number;
  fecha_limite?: string;
  status?: "Próxima" | "Activa" | "Cerrada";
  clase?: string[];
}

export interface RecursoRecord {
  id?: string;
  titulo?: string;
  url?: string;
  tipo?: string;
  descripcion?: string;
  dias_offset?: number;
  fecha_disponible?: string;
  clase?: string[];
}

export async function createClase(data: ClaseInput): Promise<string> {
  const fields: Record<string, unknown> = {
    titulo: data.titulo,
    status: data.status ?? "Próxima",
  };
  if (data.descripcion) fields.descripcion = data.descripcion;
  if (data.semana) fields.semana = data.semana;
  if (data.fecha) fields.fecha = data.fecha;
  if (data.url_live) fields.url_live = data.url_live;
  if (data.url_grabacion) fields.url_grabacion = data.url_grabacion;
  const record = await base(Tables.CLASES).create(fields as never);
  return record.id;
}

export async function updateClase(id: string, data: Partial<ClaseInput>) {
  await base(Tables.CLASES).update(id, data as never);
}

export async function createMision(data: MisionInput): Promise<string> {
  const fields: Record<string, unknown> = {
    titulo: data.titulo,
    status: data.status ?? "Próxima",
  };
  if (data.descripcion) fields.descripcion = data.descripcion;
  if (data.instrucciones) fields.instrucciones = data.instrucciones;
  if (data.semana) fields.semana = data.semana;
  if (data.dias_offset !== undefined) fields.dias_offset = data.dias_offset;
  if (data.fecha_limite) fields.fecha_limite = data.fecha_limite;
  if (data.claseId) fields.clase = [data.claseId];
  const record = await base(Tables.MISIONES).create(fields as never);
  return record.id;
}

export async function updateMision(id: string, data: Partial<MisionInput>) {
  const fields: Record<string, unknown> = { ...data };
  delete fields.claseId;
  if (data.claseId) fields.clase = [data.claseId];
  await base(Tables.MISIONES).update(id, fields as never);
}

export async function updateRecurso(id: string, data: Partial<RecursoInput>) {
  const fields: Record<string, unknown> = { ...data };
  delete fields.claseId;
  if (data.claseId) fields.clase = [data.claseId];
  await base(Tables.RECURSOS).update(id, fields as never);
}

export async function getAllMisiones(): Promise<MisionRecord[]> {
  const records = await base(Tables.MISIONES).select({ sort: [{ field: "semana", direction: "asc" }] }).all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as MisionRecord);
}

export async function getAllRecursos(): Promise<RecursoRecord[]> {
  const records = await base(Tables.RECURSOS).select().all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as RecursoRecord);
}

export async function createRecurso(data: RecursoInput): Promise<string> {
  const fields: Record<string, unknown> = {
    titulo: data.titulo,
  };
  if (data.url) fields.url = data.url;
  if (data.tipo) fields.tipo = data.tipo;
  if (data.descripcion) fields.descripcion = data.descripcion;
  if (data.dias_offset !== undefined) fields.dias_offset = data.dias_offset;
  if (data.fecha_disponible) fields.fecha_disponible = data.fecha_disponible;
  if (data.claseId) fields.clase = [data.claseId];
  const record = await base(Tables.RECURSOS).create(fields as never);
  return record.id;
}

export async function getProximaClase(): Promise<ClaseRecord | null> {
  const records = await base(Tables.CLASES)
    .select({
      filterByFormula: `{status} = "Próxima"`,
      sort: [{ field: "fecha", direction: "asc" }],
      maxRecords: 1,
    })
    .firstPage();
  if (!records.length) return null;
  return { id: records[0].id, ...records[0].fields } as ClaseRecord;
}

export async function countFoundersInscritos(): Promise<number> {
  const records = await base(Tables.FOUNDERS)
    .select({ filterByFormula: `{portal_access} = 1` })
    .all();
  return records.length;
}

export async function getClaseById(id: string): Promise<(ClaseRecord & {
  misionesData: MisionRecord[];
  recursosData: RecursoRecord[];
}) | null> {
  const all = await getClasesWithContent();
  return all.find((c) => c.id === id) ?? null;
}

// ─── Asistencias ──────────────────────────────────────────────────────────────

export interface AsistenciaRecord {
  id?: string;
  id_asistencia?: string;
  startup_record?: string[];
  clase_record?: string[];
  asistio?: boolean;
  fecha?: string;
  notas?: string;
}

export async function createAsistencia(data: {
  startupId: string;
  claseId: string;
  asistio: boolean;
  fecha?: string;
  notas?: string;
}): Promise<string> {
  const record = await base(Tables.ASISTENCIAS).create({
    id_asistencia: `${data.startupId}-${data.claseId}`,
    startup_record: [data.startupId],
    clase_record: [data.claseId],
    asistio: data.asistio,
    fecha: data.fecha ?? new Date().toISOString().split("T")[0],
    notas: data.notas ?? "",
  } as never);
  return record.id;
}

export async function upsertAsistencia(data: {
  startupId: string;
  claseId: string;
  asistio: boolean;
  fecha?: string;
  notas?: string;
}): Promise<void> {
  const existing = await base(Tables.ASISTENCIAS)
    .select({
      filterByFormula: `AND(SEARCH("${data.startupId}", ARRAYJOIN({startup_record})), SEARCH("${data.claseId}", ARRAYJOIN({clase_record})))`,
      maxRecords: 1,
    })
    .firstPage();

  if (existing.length) {
    await base(Tables.ASISTENCIAS).update(existing[0].id, {
      asistio: data.asistio,
      fecha: data.fecha ?? new Date().toISOString().split("T")[0],
    } as never);
  } else {
    await createAsistencia(data);
  }
}

export async function getAsistenciasByStartup(startupId: string): Promise<AsistenciaRecord[]> {
  const records = await base(Tables.ASISTENCIAS)
    .select({ filterByFormula: `SEARCH("${startupId}", ARRAYJOIN({startup_record}))` })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as AsistenciaRecord);
}

export async function getAllAsistencias(): Promise<AsistenciaRecord[]> {
  const records = await base(Tables.ASISTENCIAS).select().all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as AsistenciaRecord);
}

// ─── Misiones Completadas ─────────────────────────────────────────────────────

export interface MisionCompletadaRecord {
  id?: string;
  id_respuesta?: string;
  startup_record?: string[];
  mision_record?: string[];
  completada?: boolean;
  fecha_completada?: string;
  link_entrega?: string;
  notas?: string;
}

export async function createMisionCompletada(data: {
  startupId: string;
  misionId: string;
  completada: boolean;
  fecha_completada?: string;
  link_entrega?: string;
  notas?: string;
}): Promise<string> {
  const record = await base(Tables.MISIONES_COMPLETADAS).create({
    id_respuesta: `${data.startupId}-${data.misionId}`,
    startup_record: [data.startupId],
    mision_record: [data.misionId],
    completada: data.completada,
    fecha_completada: data.fecha_completada ?? new Date().toISOString().split("T")[0],
    link_entrega: data.link_entrega ?? "",
    notas: data.notas ?? "",
  } as never);
  return record.id;
}

export async function upsertMisionCompletada(data: {
  startupId: string;
  misionId: string;
  completada: boolean;
  fecha_completada?: string;
  link_entrega?: string;
  notas?: string;
}): Promise<void> {
  const existing = await base(Tables.MISIONES_COMPLETADAS)
    .select({
      filterByFormula: `AND(SEARCH("${data.startupId}", ARRAYJOIN({startup_record})), SEARCH("${data.misionId}", ARRAYJOIN({mision_record})))`,
      maxRecords: 1,
    })
    .firstPage();

  if (existing.length) {
    await base(Tables.MISIONES_COMPLETADAS).update(existing[0].id, {
      completada: data.completada,
      fecha_completada: data.fecha_completada ?? new Date().toISOString().split("T")[0],
      link_entrega: data.link_entrega ?? "",
      notas: data.notas ?? "",
    } as never);
  } else {
    await createMisionCompletada(data);
  }
}

export async function getMisionesCompletadasByStartup(startupId: string): Promise<MisionCompletadaRecord[]> {
  const records = await base(Tables.MISIONES_COMPLETADAS)
    .select({ filterByFormula: `SEARCH("${startupId}", ARRAYJOIN({startup_record}))` })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as MisionCompletadaRecord);
}

export async function getAllMisionesCompletadas(): Promise<MisionCompletadaRecord[]> {
  const records = await base(Tables.MISIONES_COMPLETADAS).select().all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as MisionCompletadaRecord);
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface FeedbackRecord {
  id?: string;
  id_feedback?: string;
  startup_record?: string[];
  clase_record?: string[];
  rating?: number;
  comentario?: string;
  fecha?: string;
}

export async function createFeedback(data: {
  startupId: string;
  claseId: string;
  rating: number;
  comentario?: string;
}): Promise<string> {
  const record = await base(Tables.FEEDBACK).create({
    id_feedback: `${data.startupId}-${data.claseId}-${Date.now()}`,
    startup_record: [data.startupId],
    clase_record: [data.claseId],
    rating: data.rating,
    comentario: data.comentario ?? "",
    fecha: new Date().toISOString().split("T")[0],
  } as never);
  return record.id;
}

export async function getFeedbackByClase(claseId: string): Promise<FeedbackRecord[]> {
  const records = await base(Tables.FEEDBACK)
    .select({ filterByFormula: `SEARCH("${claseId}", ARRAYJOIN({clase_record}))` })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as FeedbackRecord);
}

export async function getAllFeedback(): Promise<FeedbackRecord[]> {
  const records = await base(Tables.FEEDBACK).select().all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as FeedbackRecord);
}

// ─── Video Play Log ────────────────────────────────────────────────────────────
// Reutiliza Asistencias MF26 para registrar que un founder reprodujo la grabación

// ─── Tareas ───────────────────────────────────────────────────────────────────

export interface TareaRecord {
  id?: string;
  titulo?: string;
  descripcion?: string;
  tipo?: "NPS" | "Entrega" | "Checklist";
  orden?: number;
  mision?: string[];
  clases_nps?: string[];
}

export async function getTareasByMision(misionId: string): Promise<TareaRecord[]> {
  const records = await base(Tables.TAREAS)
    .select({
      filterByFormula: `SEARCH("${misionId}", ARRAYJOIN({mision}))`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as TareaRecord);
}

export async function logVideoPlay(startupId: string, claseId: string): Promise<void> {
  await upsertAsistencia({ startupId, claseId, asistio: true });
}

// ─── Empresas Stats ────────────────────────────────────────────────────────────

export interface EmpresaStats {
  startupId: string;
  startup_name: string;
  startup_country_ops?: string;
  startup_stage?: string;
  totalClases: number;
  clasesVistas: number;
  totalMisiones: number;
  misionesCompletadas: number;
}

export async function getEmpresasStats(preloadedApps?: PostulacionRecord[]): Promise<EmpresaStats[]> {
  const [apps, allClases, allMisiones, asistencias, misionesCompletadas] = await Promise.all([
    preloadedApps ? Promise.resolve(preloadedApps) : getAllApplications(),
    base(Tables.CLASES).select({ fields: ["titulo"] }).all(),
    base(Tables.MISIONES).select({ fields: ["titulo"] }).all(),
    getAllAsistencias(),
    getAllMisionesCompletadas(),
  ]);

  const inscritas = apps.filter(
    (a) => a.status === "Inscrita" || a.status === "Invitada institucional"
  );

  const totalClases = allClases.length;
  const totalMisiones = allMisiones.length;

  return inscritas.map((app) => {
    const startupId = (app.startup_record?.[0] as string | undefined) ?? "";
    const clasesVistas = asistencias.filter(
      (a) => a.startup_record?.includes(startupId) && a.asistio
    ).length;
    const completadas = misionesCompletadas.filter(
      (m) => m.startup_record?.includes(startupId) && m.completada
    ).length;

    return {
      startupId,
      startup_name: app.startup_name ?? "—",
      startup_country_ops: app.startup_country_ops,
      startup_stage: app.startup_stage,
      totalClases,
      clasesVistas,
      totalMisiones,
      misionesCompletadas: completadas,
    };
  });
}

export async function getClasesWithContent(): Promise<(ClaseRecord & {
  misionesData: (MisionRecord & { tareasData: TareaRecord[] })[];
  recursosData: RecursoRecord[];
})[]> {
  const [clases, misiones, tareas, recursos] = await Promise.all([
    base(Tables.CLASES)
      .select({ sort: [{ field: "fecha", direction: "asc" }] })
      .all(),
    base(Tables.MISIONES).select().all(),
    base(Tables.TAREAS).select({ sort: [{ field: "orden", direction: "asc" }] }).all(),
    base(Tables.RECURSOS).select().all(),
  ]);

  // Group tareas by mision ID
  const tareasByMision = new Map<string, TareaRecord[]>();
  for (const t of tareas) {
    const f = t.fields as Record<string, unknown>;
    const misionIds = (f.mision as string[]) ?? [];
    const record = { id: t.id, ...f } as TareaRecord;
    for (const mid of misionIds) {
      if (!tareasByMision.has(mid)) tareasByMision.set(mid, []);
      tareasByMision.get(mid)!.push(record);
    }
  }

  // Group misiones by clase ID (with their tareas)
  const misionesByClase = new Map<string, (MisionRecord & { tareasData: TareaRecord[] })[]>();
  for (const m of misiones) {
    const f = m.fields as Record<string, unknown>;
    const claseIds = (f.clase as string[]) ?? [];
    const record = { id: m.id, ...f, tareasData: tareasByMision.get(m.id) ?? [] } as MisionRecord & { tareasData: TareaRecord[] };
    for (const cid of claseIds) {
      if (!misionesByClase.has(cid)) misionesByClase.set(cid, []);
      misionesByClase.get(cid)!.push(record);
    }
  }

  const recursosByClase = new Map<string, RecursoRecord[]>();
  for (const r of recursos) {
    const f = r.fields as Record<string, unknown>;
    const claseIds = (f.clase as string[]) ?? [];
    const record = { id: r.id, ...f } as RecursoRecord;
    for (const cid of claseIds) {
      if (!recursosByClase.has(cid)) recursosByClase.set(cid, []);
      recursosByClase.get(cid)!.push(record);
    }
  }

  return clases.map((c) => ({
    id: c.id,
    ...(c.fields as ClaseRecord),
    misionesData: misionesByClase.get(c.id) ?? [],
    recursosData: recursosByClase.get(c.id) ?? [],
  }));
}

// ─── CMS Público ──────────────────────────────────────────────────────────────
// Todas las tablas de contenido del sitio público viven en Airtable.
// Patrón común: campo `activa` (bool), `orden` (number).

// ── home_metrics ──────────────────────────────────────────────────────────────

export interface HomeMetrics {
  id?: string;
  edicion: string;
  capital_levantado_usd: number;
  n_startups: number;
  n_paises: number;
  n_inversionistas: number;
  n_masterclasses: number;
  nps: number;
  activa: boolean;
}

export async function getHomeMetrics(edicion = "2025"): Promise<HomeMetrics | null> {
  const records = await base(Tables.HOME_METRICS)
    .select({ filterByFormula: `AND({edicion} = "${edicion}", {activa} = 1)`, maxRecords: 1 })
    .firstPage();
  if (!records.length) return null;
  return { id: records[0].id, ...records[0].fields } as HomeMetrics;
}

// ── home_testimonios ──────────────────────────────────────────────────────────

export interface HomeTestimonio {
  id?: string;
  nombre: string;
  empresa: string;
  ronda: string;
  quote: string;
  foto_url: string;
  orden: number;
  activa: boolean;
}

export async function getHomeTestimonios(): Promise<HomeTestimonio[]> {
  const records = await base(Tables.HOME_TESTIMONIOS)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeTestimonio);
}

// ── home_casos_exito ──────────────────────────────────────────────────────────

export interface HomeCasoExito {
  id?: string;
  startup_nombre: string;
  logo_url: string;
  monto_usd: number;
  investors: string;
  hook: string;
  orden: number;
  activa: boolean;
}

export async function getHomeCasosExito(): Promise<HomeCasoExito[]> {
  const records = await base(Tables.HOME_CASOS_EXITO)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
      maxRecords: 6,
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeCasoExito);
}

// ── home_logos_alumni ─────────────────────────────────────────────────────────

export interface HomeLogoAlumni {
  id?: string;
  nombre: string;
  logo_url: string;
  alt: string;
  orden: number;
  activa: boolean;
}

export async function getHomeLogosAlumni(): Promise<HomeLogoAlumni[]> {
  const records = await base(Tables.HOME_LOGOS_ALUMNI)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeLogoAlumni);
}

// ── home_logos_partners ───────────────────────────────────────────────────────

export type SponsorTier = 1 | 2 | 3;
export type SponsorType = "corporate" | "paying" | "program";

export interface HomeLogoPartner {
  id?: string;
  nombre: string;
  logo_url: string;
  alt: string;
  tier: SponsorTier;
  type: SponsorType;
  website_url?: string;
  orden: number;
  activa: boolean;
}

export async function getHomeLogosPartners(): Promise<HomeLogoPartner[]> {
  const records = await base(Tables.HOME_LOGOS_PARTNERS)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeLogoPartner);
}

export async function getHomeLogosPartnersByTier(tier: SponsorTier): Promise<HomeLogoPartner[]> {
  const records = await base(Tables.HOME_LOGOS_PARTNERS)
    .select({
      filterByFormula: `AND({activa} = 1, {tier} = ${tier})`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeLogoPartner);
}

// ── advisors ──────────────────────────────────────────────────────────────────

export interface Advisor {
  id?: string;
  nombre: string;
  foto_url: string;
  cargo: string;
  track_record: string;
  especialidad: string;
  ideal_para: string;
  formato: string;
  pricing_display: string;
  modalidad: string;
  calendly_url: string;
  orden: number;
  activa: boolean;
}

export async function getAdvisors(): Promise<Advisor[]> {
  const records = await base(Tables.ADVISORS)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as Advisor);
}

// ── masterclasses ─────────────────────────────────────────────────────────────

export type ContentEstado = "Abierto" | "Exclusivo" | "Próximo";

export interface Masterclass {
  id?: string;
  titulo: string;
  tema: string;
  partner: string;
  speaker: string;
  video_url_youtube: string;
  thumbnail_url: string;
  insight_gratis: string;
  insight_bloqueado_1: string;
  insight_bloqueado_2: string;
  estado: ContentEstado;
  fecha: string;
  duracion_min: number;
  orden: number;
  activa: boolean;
}

export async function getMasterclasses(): Promise<Masterclass[]> {
  const records = await base(Tables.MASTERCLASSES)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as Masterclass);
}

// ── live_interviews ───────────────────────────────────────────────────────────

export interface LiveInterview {
  id?: string;
  titulo: string;
  entrevistado_nombre: string;
  entrevistado_cargo: string;
  entrevistado_empresa: string;
  entrevistado_foto_url: string;
  tema: string;
  video_url_youtube: string;
  thumbnail_url: string;
  aprendizaje_gratis: string;
  aprendizaje_bloqueado_1: string;
  aprendizaje_bloqueado_2: string;
  estado: ContentEstado;
  fecha: string;
  duracion_min: number;
  orden: number;
  activa: boolean;
}

export async function getLiveInterviews(): Promise<LiveInterview[]> {
  const records = await base(Tables.LIVE_INTERVIEWS)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as LiveInterview);
}

// ── house_rules ───────────────────────────────────────────────────────────────

export interface HouseRule {
  id?: string;
  titulo: string;
  descripcion: string;
  icono: string;
  categoria: string;
  orden: number;
  activa: boolean;
}

export async function getHouseRules(): Promise<HouseRule[]> {
  const records = await base(Tables.HOUSE_RULES)
    .select({
      filterByFormula: `{activa} = 1`,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HouseRule);
}

// ── rockstars ─────────────────────────────────────────────────────────────────

export type RockstarTipo = "Rockstar" | "Partner" | "Speaker" | "Mentor" | "Investor" | "Founder";
export type RockstarTag = "VC" | "Founder" | "Legal" | "Growth" | "Fundraising" | "Impact" | "Climate" | "Fintech" | "AI";

export interface Rockstar {
  id?: string;
  nombre: string;
  foto_url: string;
  cargo: string;
  empresa: string;
  track_record_oneliner: string;
  tipo: RockstarTipo;
  linkedin_url: string;
  tags: RockstarTag[];
  confirmed_mf26: boolean;
  featured: boolean;
  featured_this_week: boolean;
  orden: number;
  activa: boolean;
}

export async function getRockstars(filters?: {
  tipo?: RockstarTipo;
  tag?: RockstarTag;
  confirmed_mf26?: boolean;
  featured_this_week?: boolean;
}): Promise<Rockstar[]> {
  const conditions = ["{activa} = 1"];
  if (filters?.tipo) conditions.push(`{tipo} = "${filters.tipo}"`);
  if (filters?.tag) conditions.push(`FIND("${filters.tag}", ARRAYJOIN({tags}))`);
  if (filters?.confirmed_mf26) conditions.push(`{confirmed_mf26} = 1`);
  if (filters?.featured_this_week) conditions.push(`{featured_this_week} = 1`);

  const formula = conditions.length === 1 ? conditions[0] : `AND(${conditions.join(", ")})`;

  const records = await base(Tables.ROCKSTARS)
    .select({
      filterByFormula: formula,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as Rockstar);
}

export async function getFeaturedRockstarThisWeek(): Promise<Rockstar | null> {
  const results = await getRockstars({ featured_this_week: true });
  return results[0] ?? null;
}

// ── qa ────────────────────────────────────────────────────────────────────────

export type QACategoria = "Programa" | "Logística" | "Pago" | "Selección" | "Post-programa";
export type QASource = "existente" | "whatsapp" | "email";

export interface QAItem {
  id?: string;
  pregunta: string;
  respuesta: string;
  categoria: QACategoria;
  orden: number;
  activa: boolean;
  source: QASource;
}

export async function getQA(categoria?: QACategoria): Promise<QAItem[]> {
  const conditions = ["{activa} = 1"];
  if (categoria) conditions.push(`{categoria} = "${categoria}"`);
  const formula = conditions.length === 1 ? conditions[0] : `AND(${conditions.join(", ")})`;

  const records = await base(Tables.QA)
    .select({
      filterByFormula: formula,
      sort: [{ field: "orden", direction: "asc" }],
    })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as QAItem);
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export type TriggerEvent =
  | "checkout_completed"
  | "invoice_paid_cuota2"
  | "invoice_paid_cuota3"
  | "payment_failed_1"
  | "payment_failed_2"
  | "payment_failed_3"
  | "admission_approved"
  | "admission_rejected"
  | "follow_up_1"
  | "follow_up_2"
  | "subscription_cancelled"
  | "portal_deactivated"
  | "application_received"
  | "onboarding";

export interface EmailTemplate {
  id?: string;
  name: string;
  label: string;
  subject: string;
  body_html: string;
  active: boolean;
}

export interface AutomationRule {
  id?: string;
  name: string;
  trigger_event: TriggerEvent;
  trigger_condition?: string;
  template_id: string[];
  template?: EmailTemplate;
  delay_hours: number;
  channel: "email" | "whatsapp";
  active: boolean;
  order: number;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const records = await base(Tables.EMAIL_TEMPLATES)
    .select({ sort: [{ field: "name", direction: "asc" }] })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as EmailTemplate);
}

export async function getEmailTemplate(name: string): Promise<EmailTemplate | null> {
  const records = await base(Tables.EMAIL_TEMPLATES)
    .select({ filterByFormula: `{name} = "${name}"`, maxRecords: 1 })
    .firstPage();
  if (!records.length) return null;
  return { id: records[0].id, ...records[0].fields } as EmailTemplate;
}

export async function upsertEmailTemplate(data: Omit<EmailTemplate, "id">): Promise<string> {
  const existing = await base(Tables.EMAIL_TEMPLATES)
    .select({ filterByFormula: `{name} = "${data.name}"`, maxRecords: 1 })
    .firstPage();
  if (existing.length) {
    await base(Tables.EMAIL_TEMPLATES).update(existing[0].id, data as never);
    return existing[0].id;
  }
  const record = await base(Tables.EMAIL_TEMPLATES).create(data as never);
  return record.id;
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<void> {
  const fields: Record<string, unknown> = { ...data };
  delete fields.id;
  await base(Tables.EMAIL_TEMPLATES).update(id, fields as never);
}

export async function getAutomationRules(triggerEvent?: TriggerEvent): Promise<AutomationRule[]> {
  const formula = triggerEvent
    ? `AND({active} = 1, {trigger_event} = "${triggerEvent}")`
    : "{active} = 1";
  const records = await base(Tables.AUTOMATION_RULES)
    .select({ filterByFormula: formula, sort: [{ field: "order", direction: "asc" }] })
    .all();

  const rules = records.map((r) => ({ id: r.id, ...r.fields }) as AutomationRule);

  // Enrich with template data
  const templateIds = [...new Set(rules.flatMap((r) => r.template_id ?? []))];
  if (!templateIds.length) return rules;

  const templates = await Promise.all(templateIds.map((tid) => base(Tables.EMAIL_TEMPLATES).find(tid)));
  const templateMap = new Map(templates.map((t) => [t.id, { id: t.id, ...t.fields } as EmailTemplate]));

  return rules.map((rule) => ({
    ...rule,
    template: rule.template_id?.[0] ? templateMap.get(rule.template_id[0]) : undefined,
  }));
}

export async function upsertAutomationRule(data: Omit<AutomationRule, "id" | "template">): Promise<string> {
  const existing = await base(Tables.AUTOMATION_RULES)
    .select({ filterByFormula: `{name} = "${data.name}"`, maxRecords: 1 })
    .firstPage();
  const fields: Record<string, unknown> = {
    name: data.name,
    trigger_event: data.trigger_event,
    trigger_condition: data.trigger_condition ?? "",
    template_id: data.template_id,
    delay_hours: data.delay_hours,
    channel: data.channel,
    active: data.active,
    order: data.order,
  };
  if (existing.length) {
    await base(Tables.AUTOMATION_RULES).update(existing[0].id, fields as never);
    return existing[0].id;
  }
  const record = await base(Tables.AUTOMATION_RULES).create(fields as never);
  return record.id;
}

export async function updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<void> {
  const fields: Record<string, unknown> = { ...data };
  delete fields.id;
  delete fields.template;
  await base(Tables.AUTOMATION_RULES).update(id, fields as never);
}

export async function deleteAutomationRule(id: string): Promise<void> {
  await base(Tables.AUTOMATION_RULES).destroy(id);
}

export async function saveChurnReason(postulacionId: string, reason: string): Promise<void> {
  await base(Tables.POSTULACIONES).update(postulacionId, { churn_reason: reason } as never);
}

export type ChurnReasonCode =
  | "precio"
  | "tiempo"
  | "prioridades"
  | "ronda_levantada"
  | "no_esperado"
  | "otro";

export const CHURN_REASON_LABELS: Record<ChurnReasonCode, string> = {
  precio: "El precio no se ajusta a mi presupuesto actual",
  tiempo: "No tengo el tiempo que requiere el programa",
  prioridades: "Mis prioridades cambiaron y el fundraising no es el foco ahora",
  ronda_levantada: "Ya levanté mi ronda",
  no_esperado: "El programa no era lo que esperaba",
  otro: "Otro",
};

export interface RechazoInput {
  startupId?: string;
  postulacionId?: string;
  founderId?: string;
  reasonCode: ChurnReasonCode;
  reasonLabel: string;
  detail?: string;
  email?: string;
}

export async function createRechazoRecord(data: RechazoInput): Promise<string> {
  const fields: Record<string, unknown> = {
    reason_code: data.reasonCode,
    reason_label: data.reasonLabel,
    created_at: new Date().toISOString(),
  };
  if (data.detail) fields.detail = data.detail;
  if (data.email) fields.email = data.email;
  if (data.startupId) fields.Startup = [data.startupId];
  if (data.postulacionId) fields.Postulacion = [data.postulacionId];
  if (data.founderId) fields.Founder = [data.founderId];
  const record = await base(Tables.RECHAZOS).create(fields as never);
  return record.id;
}

// ── Design Tokens ─────────────────────────────────────────────────────────────

export interface DesignTokens {
  id: string;
  edicion: string;
  // Colores
  color_primary: string;
  color_secondary: string;
  color_teal: string;
  color_violet: string;
  color_bg: string;
  color_bg_deep: string;
  impacta_green: string;
  impacta_green_deep: string;
  font_family: string;
  activa: boolean;
  // Configuración general
  close_date: string;
  whatsapp_phone: string;
  pricing_upfront_monthly: number;
  pricing_upfront_total: number;
  pricing_mensual_monthly: number;
  pricing_mensual_total: number;
  // Stats homepage
  stat_capital_usd_m: number;
  stat_startups: number;
  stat_inversores: number;
  stat_nps: number;
  stat_capital_promedio_usd_m: number;
  stat_paises_alumni: number;
}

export async function getDesignTokens(): Promise<DesignTokens | null> {
  const records = await base(Tables.DESIGN_TOKENS)
    .select({ filterByFormula: "{activa} = 1", maxRecords: 1 })
    .firstPage();
  if (!records.length) return null;
  const f = records[0].fields as Record<string, unknown>;
  return {
    id: records[0].id,
    edicion: (f.edicion as string) ?? "MF26",
    color_primary: (f.color_primary as string) ?? "#ff0080",
    color_secondary: (f.color_secondary as string) ?? "#ff8a3c",
    color_teal: (f.color_teal as string) ?? "#5eead4",
    color_violet: (f.color_violet as string) ?? "#c4b5fd",
    color_bg: (f.color_bg as string) ?? "#0a0f23",
    color_bg_deep: (f.color_bg_deep as string) ?? "#050816",
    impacta_green: (f.impacta_green as string) ?? "#10b981",
    impacta_green_deep: (f.impacta_green_deep as string) ?? "#047857",
    font_family: (f.font_family as string) ?? "Inter",
    activa: (f.activa as boolean) ?? true,
    close_date: (f.close_date as string) ?? "2026-06-22T23:59:59-03:00",
    whatsapp_phone: (f.whatsapp_phone as string) ?? "",
    pricing_upfront_monthly: (f.pricing_upfront_monthly as number) ?? 279,
    pricing_upfront_total: (f.pricing_upfront_total as number) ?? 837,
    pricing_mensual_monthly: (f.pricing_mensual_monthly as number) ?? 349,
    pricing_mensual_total: (f.pricing_mensual_total as number) ?? 1047,
    stat_capital_usd_m: (f.stat_capital_usd_m as number) ?? 190,
    stat_startups: (f.stat_startups as number) ?? 400,
    stat_inversores: (f.stat_inversores as number) ?? 200,
    stat_nps: (f.stat_nps as number) ?? 92,
    stat_capital_promedio_usd_m: (f.stat_capital_promedio_usd_m as number) ?? 1.9,
    stat_paises_alumni: (f.stat_paises_alumni as number) ?? 12,
  };
}

export async function updateDesignTokens(
  id: string,
  fields: Partial<Omit<DesignTokens, "id">>
): Promise<void> {
  await base(Tables.DESIGN_TOKENS).update(id, fields as never);
}

// ── landing_textos ────────────────────────────────────────────────────────────
// Key-value store para copy estático del hero y otras secciones de la landing.

export const LANDING_TEXTOS_DEFAULTS: Record<string, string> = {
  hero_tagline: "Construye momentum que los inversionistas no puedan ignorar.",
  hero_descripcion:
    "El método que +400 startups de LatAm usaron para levantar US$190M. Si vas a salir a la calle por pre-seed, seed o post-seed entre US$500K y US$5M este año — este es el programa.",
  hero_chip_precio: "US$349/mes",
  hero_chip_duracion: "13 semanas",
  hero_chip_modalidad: "100% online",
  hero_chip_garantia: "Money Back 14 días",
  hero_cta_primario: "Postular ahora →",
  hero_cta_secundario: "Hablar con el equipo",
  hero_whatsapp_url: "https://wa.me/56920620253?text=Hola%20MF26",
  hero_instructor_nombre: "David Alvo",
  hero_instructor_cargo: "Founder & Managing Partner, Impacta VC",
  hero_instructor_foto_url: "",
};

export async function getLandingTextos(): Promise<Record<string, string>> {
  try {
    const records = await base("landing_textos")
      .select({ filterByFormula: "{activa} = 1" })
      .all();
    const result: Record<string, string> = { ...LANDING_TEXTOS_DEFAULTS };
    for (const r of records) {
      const f = r.fields as Record<string, unknown>;
      if (f.key && f.value) result[f.key as string] = f.value as string;
    }
    return result;
  } catch {
    return { ...LANDING_TEXTOS_DEFAULTS };
  }
}

export async function setLandingTextos(data: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    const existing = await base("landing_textos")
      .select({ filterByFormula: `{key} = "${key}"`, maxRecords: 1 })
      .firstPage();
    if (existing.length) {
      await base("landing_textos").update(existing[0].id, { value } as never);
    } else {
      await base("landing_textos").create({ key, value, activa: true } as never);
    }
  }
}

// ── landing_cards ─────────────────────────────────────────────────────────────
// Outcomes (qué aprenden) y Pillars (por qué MF) en una sola tabla.

export interface LandingCard {
  id?: string;
  seccion: "outcome" | "pillar";
  titulo: string;
  descripcion: string;
  icono: string;
  orden: number;
  activa: boolean;
}

export const LANDING_OUTCOMES_DEFAULTS: LandingCard[] = [
  { seccion: "outcome", titulo: "Estrategia de ronda", descripcion: "Define el tamaño, timing y estructura de tu ronda.", icono: "🎯", orden: 1, activa: true },
  { seccion: "outcome", titulo: "Narrativa investor-ready", descripcion: "Deck y pitch que abren reuniones con los mejores fondos.", icono: "📝", orden: 2, activa: true },
  { seccion: "outcome", titulo: "Investor targeting", descripcion: "Lista priorizada de inversores que realmente invierten en tu tesis.", icono: "🔍", orden: 3, activa: true },
  { seccion: "outcome", titulo: "Cierre efectivo", descripcion: "Momentum y FOMO para cerrar en términos que protejan tu cap table.", icono: "🤝", orden: 4, activa: true },
];

export const LANDING_PILLARS_DEFAULTS: LandingCard[] = [
  { seccion: "pillar", titulo: "Premium", descripcion: "Cohortes chicas, acceso directo a instructores y red de inversores real.", icono: "⭐", orden: 1, activa: true },
  { seccion: "pillar", titulo: "LatAm-centric", descripcion: "Construido para el ecosistema LatAm, no para Silicon Valley.", icono: "🌎", orden: 2, activa: true },
  { seccion: "pillar", titulo: "Founder-to-founder", descripcion: "Aprende de founders que levantaron, no de consultores que nunca lo hicieron.", icono: "🤜", orden: 3, activa: true },
  { seccion: "pillar", titulo: "Investor network real", descripcion: "Acceso a +200 inversores activos en LatAm.", icono: "🏦", orden: 4, activa: true },
];

export async function getLandingCards(seccion: "outcome" | "pillar"): Promise<LandingCard[]> {
  try {
    const records = await base("landing_cards")
      .select({
        filterByFormula: `AND({activa} = 1, {seccion} = "${seccion}")`,
        sort: [{ field: "orden", direction: "asc" }],
      })
      .all();
    if (!records.length) {
      return seccion === "outcome" ? LANDING_OUTCOMES_DEFAULTS : LANDING_PILLARS_DEFAULTS;
    }
    return records.map((r) => ({ id: r.id, ...r.fields }) as LandingCard);
  } catch {
    return seccion === "outcome" ? LANDING_OUTCOMES_DEFAULTS : LANDING_PILLARS_DEFAULTS;
  }
}

export async function setLandingCards(seccion: "outcome" | "pillar", cards: Omit<LandingCard, "id">[]): Promise<void> {
  const existing = await base("landing_cards")
    .select({ filterByFormula: `{seccion} = "${seccion}"` })
    .all();
  if (existing.length) {
    await base("landing_cards").destroy(existing.map((r) => r.id));
  }
  if (cards.length) {
    await base("landing_cards").create(
      cards.map((c) => ({ fields: { ...c, seccion } as never }))
    );
  }
}

// ── instructores_mf26 ─────────────────────────────────────────────────────────

export interface Instructor {
  id?: string;
  nombre: string;
  foto_url: string;
  rol: string;
  org: string;
  linkedin_url?: string;
  orden: number;
  activa: boolean;
}

export async function getInstructores(): Promise<Instructor[]> {
  try {
    const records = await base(Tables.INSTRUCTORES)
      .select({
        filterByFormula: "{activa} = 1",
        sort: [{ field: "orden", direction: "asc" }],
      })
      .all();
    return records.map((r) => ({ id: r.id, ...r.fields }) as Instructor);
  } catch {
    return [];
  }
}

export async function setInstructores(instructores: Instructor[]): Promise<void> {
  for (const inst of instructores) {
    const fields = {
      nombre: inst.nombre,
      foto_url: inst.foto_url,
      rol: inst.rol,
      org: inst.org,
      linkedin_url: inst.linkedin_url,
      orden: inst.orden,
      activa: inst.activa,
    };
    if (inst.id) {
      await base(Tables.INSTRUCTORES).update(inst.id, fields as never);
    } else {
      await base(Tables.INSTRUCTORES).create(fields as never);
    }
  }
}

// ── home_casos_exito (extended) ───────────────────────────────────────────────
// Re-exporta la interfaz extendida y función de actualización para el CMS admin.

export interface HomeCasoExitoExtended extends HomeCasoExito {
  destacado_quote?: boolean;
  pais_emoji?: string;
  link_linkedin?: string;
  quote_destacado?: string;
}

export async function getHomeCasosExitoAll(): Promise<HomeCasoExitoExtended[]> {
  const records = await base(Tables.HOME_CASOS_EXITO)
    .select({ sort: [{ field: "orden", direction: "asc" }] })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as HomeCasoExitoExtended);
}

export async function updateHomeCasoExito(id: string, data: Partial<HomeCasoExitoExtended>): Promise<void> {
  const fields: Record<string, unknown> = { ...data };
  delete fields.id;
  await base(Tables.HOME_CASOS_EXITO).update(id, fields as never);
}

// ── advisors (extended) ───────────────────────────────────────────────────────

export interface AdvisorExtended extends Advisor {
  cupos_total?: number;
  cupos_disponibles?: number;
}

export async function getAdvisorsAll(): Promise<AdvisorExtended[]> {
  const records = await base(Tables.ADVISORS)
    .select({ sort: [{ field: "orden", direction: "asc" }] })
    .all();
  return records.map((r) => ({ id: r.id, ...r.fields }) as AdvisorExtended);
}

export async function updateAdvisor(id: string, data: Partial<AdvisorExtended>): Promise<void> {
  const fields: Record<string, unknown> = { ...data };
  delete fields.id;
  await base(Tables.ADVISORS).update(id, fields as never);
}
