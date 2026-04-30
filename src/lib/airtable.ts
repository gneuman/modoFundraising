import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!
);

export const Tables = {
  POSTULACIONES: "Postulaciones MF26",
  FOUNDERS: "Founders MF26",
  STARTUPS: "Startups MF26",
  PAGOS: "Pagos MF26",
  CUPONES: "Cupones MF26",
  CLASES: "Clases MF26",
  MISIONES: "Misiones MF26",
  RECURSOS: "Recursos MF26",
  ASISTENCIAS: "Asistencias MF26",
  MISIONES_COMPLETADAS: "Misiones Completadas MF26",
  FEEDBACK: "Feedback MF26",
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
  round_tickets: string[];
  runway: number;
  deck_url: string;
  program_source: string;
  ias_interested: string;
  // Postulación-only fields → go to Postulaciones MF26
  referral_code?: string;
  has_referrals: string;
  referral_1_name?: string;
  referral_1_lastname?: string;
  referral_1_email?: string;
  referral_1_linkedin?: string;
  referral_1_relation?: string;
  referral_2_name?: string;
  referral_2_lastname?: string;
  referral_2_email?: string;
  referral_2_linkedin?: string;
  referral_2_relation?: string;
  referral_3_name?: string;
  referral_3_lastname?: string;
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
  follow_up_1_sent?: boolean;
  follow_up_2_sent?: boolean;
  coupon_code?: string;
  discount_percent?: number;
  stripe_coupon_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  rejection_reason?: string;
  churn_reason?: string;
  portal_access?: boolean;
  referral_code?: string;
  has_referrals?: string;
  referral_1_name?: string;
  referral_1_lastname?: string;
  referral_1_email?: string;
  referral_1_linkedin?: string;
  referral_1_relation?: string;
  referral_2_name?: string;
  referral_2_lastname?: string;
  referral_2_email?: string;
  referral_2_linkedin?: string;
  referral_2_relation?: string;
  referral_3_name?: string;
  referral_3_lastname?: string;
  referral_3_email?: string;
  referral_3_linkedin?: string;
  referral_3_relation?: string;
  accept_legal_terms?: boolean;
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

export async function createFounderRecord(data: ApplicationFormData): Promise<string> {
  const record = await base(Tables.FOUNDERS).create({
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    whatsapp: data.whatsapp,
    linkedin_founder: data.linkedin_founder,
    founder_role: data.founder_role,
    country_residence: data.country_residence,
    founder_team_women: data.founder_team_women,
    portal_access: false,
    joined_at: new Date().toISOString(),
  } as never);
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
  portal_access: boolean;
}

export interface FounderProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  portal_access: boolean;
  stripe_customer_id?: string;
  // from postulacion
  postulacion_id?: string;
  status?: ApplicationStatus;
  payment_status?: PaymentStatus;
  stripe_coupon_id?: string;
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
    portal_access: f.portal_access as boolean ?? false,
    stripe_customer_id: f.stripe_customer_id as string | undefined,
  };

  const postulacionIds = f["Postulaciones MF26"] as string[] | undefined;
  if (!postulacionIds?.length) return profile;

  const postulacion = await base(Tables.POSTULACIONES).find(postulacionIds[0]);
  const pf = postulacion.fields as Record<string, unknown>;
  profile.postulacion_id = postulacion.id;
  profile.status = pf.status as ApplicationStatus | undefined;
  profile.payment_status = pf.payment_status as PaymentStatus | undefined;
  profile.stripe_coupon_id = pf.stripe_coupon_id as string | undefined;
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
          portal_access: ff.portal_access as boolean ?? false,
        };
      });
    }
  }

  return profile;
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

export async function createStartupRecord(data: ApplicationFormData): Promise<string> {
  const record = await base(Tables.STARTUPS).create({
    startup_name: data.startup_name,
    startup_website: data.startup_website,
    startup_linkedin: data.startup_linkedin,
    startup_logo_url: data.startup_logo_url ?? "",
    startup_country_ops: data.startup_country_ops,
    startup_countries_expansion: data.startup_countries_expansion.join(", "),
    startup_description: data.startup_description,
    startup_industries: data.startup_industries.join(", "),
    startup_industry_other: data.startup_industry_other ?? "",
    business_model: data.business_model,
    business_model_other: data.business_model_other ?? "",
    startup_stage: data.startup_stage,
    startup_usa_intl: data.startup_usa_intl,
    startup_team_size: data.startup_team_size,
    startup_mrr: data.startup_mrr,
    startup_sales_12m: data.startup_sales_12m,
    prior_fundraising: data.prior_fundraising,
    prior_fundraising_amount: data.prior_fundraising_amount ?? 0,
    round_open: data.round_open,
    round_series: data.round_series,
    round_size: data.round_size,
    round_tickets: data.round_tickets.join(", "),
    runway: data.runway,
    deck_url: data.deck_url,
    program_source: data.program_source,
    ias_interested: data.ias_interested,
    status: "Postulada",
    created_at: new Date().toISOString(),
  } as never);
  return record.id;
}

export async function getStartupById(id: string): Promise<StartupRecord | null> {
  try {
    const record = await base(Tables.STARTUPS).find(id);
    return { id: record.id, ...record.fields } as StartupRecord;
  } catch {
    return null;
  }
}

export async function updateStartup(id: string, data: Partial<StartupRecord>) {
  const fields: Record<string, unknown> = { ...data };
  delete fields.id;
  delete fields.status;
  delete fields.created_at;
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

export async function createApplication(data: ApplicationFormData): Promise<{
  postulacionId: string;
  founderRecordId: string;
  startupRecordId: string;
}> {
  // Create Founder and Startup records in parallel
  const [founderRecordId, startupRecordId] = await Promise.all([
    createFounderRecord(data),
    createStartupRecord(data),
  ]);

  // Create Postulacion with only operational fields + links
  const record = await base(Tables.POSTULACIONES).create({
    status: "Nueva postulación",
    created_at: new Date().toISOString(),
    payment_status: "Pendiente",
    portal_access: false,
    accept_legal_terms: data.accept_legal_terms,
    referral_code: data.referral_code ?? "",
    has_referrals: data.has_referrals,
    referral_1_name: data.referral_1_name ?? "",
    referral_1_lastname: data.referral_1_lastname ?? "",
    referral_1_email: data.referral_1_email ?? "",
    referral_1_linkedin: data.referral_1_linkedin ?? "",
    referral_1_relation: data.referral_1_relation ?? "",
    referral_2_name: data.referral_2_name ?? "",
    referral_2_lastname: data.referral_2_lastname ?? "",
    referral_2_email: data.referral_2_email ?? "",
    referral_2_linkedin: data.referral_2_linkedin ?? "",
    referral_2_relation: data.referral_2_relation ?? "",
    referral_3_name: data.referral_3_name ?? "",
    referral_3_lastname: data.referral_3_lastname ?? "",
    referral_3_email: data.referral_3_email ?? "",
    referral_3_linkedin: data.referral_3_linkedin ?? "",
    referral_3_relation: data.referral_3_relation ?? "",
    founder_record: [founderRecordId],
    startup_record: [startupRecordId],
  } as never);

  return { postulacionId: record.id, founderRecordId, startupRecordId };
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
  // Check in Founders table
  const founders = await base(Tables.FOUNDERS)
    .select({ filterByFormula: `{email} = "${email}"`, maxRecords: 1 })
    .firstPage();
  return founders.length ? { email } as PostulacionRecord : null;
}

export async function assignCouponToApplication(
  recordId: string,
  couponCode: string,
  discountPercent: number,
  stripeCouponId: string
) {
  const fields: Record<string, unknown> = {
    coupon_code: couponCode,
    discount_percent: discountPercent,
  };
  if (stripeCouponId) fields.stripe_coupon_id = stripeCouponId;
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

export async function getEmpresasStats(): Promise<EmpresaStats[]> {
  const [apps, allClases, allMisiones, asistencias, misionesCompletadas] = await Promise.all([
    getAllApplications(),
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
  misionesData: MisionRecord[];
  recursosData: RecursoRecord[];
})[]> {
  const [clases, misiones, recursos] = await Promise.all([
    base(Tables.CLASES)
      .select({ sort: [{ field: "semana", direction: "asc" }] })
      .all(),
    base(Tables.MISIONES).select().all(),
    base(Tables.RECURSOS).select().all(),
  ]);

  // Group misiones and recursos by their linked clase ID
  const misionesByClase = new Map<string, MisionRecord[]>();
  for (const m of misiones) {
    const f = m.fields as Record<string, unknown>;
    const claseIds = (f.clase as string[]) ?? [];
    const record = { id: m.id, ...f } as MisionRecord;
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
