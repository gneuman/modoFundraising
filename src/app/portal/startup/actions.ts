"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, getFounderByEmail, updateStartup, updateFounder } from "@/lib/airtable";

export async function guardarStartup(formData: FormData) {
  const session = await obtenerSesion();
  if (!session) throw new Error("No autorizado");

  const profile = await getFounderProfile(session.email);
  if (!profile?.startup_record_id) throw new Error("Startup no encontrada");

  const num = (key: string) => {
    const v = formData.get(key) as string;
    return v ? Number(v) : undefined;
  };
  const str = (key: string) => (formData.get(key) as string) || undefined;

  await updateStartup(profile.startup_record_id, {
    startup_name: str("startup_name"),
    startup_website: str("startup_website"),
    startup_linkedin: str("startup_linkedin"),
    startup_description: str("startup_description"),
    startup_country_ops: str("startup_country_ops"),
    startup_industries: str("startup_industries"),
    startup_stage: str("startup_stage"),
    business_model: str("business_model"),
    startup_team_size: num("startup_team_size"),
    startup_mrr: num("startup_mrr"),
    startup_sales_12m: num("startup_sales_12m"),
    round_series: str("round_series"),
    round_size: num("round_size"),
    runway: num("runway"),
    deck_url: str("deck_url"),
  });

  revalidatePath("/portal/startup");
}

export async function guardarPerfil(formData: FormData) {
  const session = await obtenerSesion();
  if (!session) throw new Error("No autorizado");

  const [founder, profile] = await Promise.all([
    getFounderByEmail(session.email),
    getFounderProfile(session.email),
  ]);

  if (!founder?.id) throw new Error("Founder no encontrado");
  if (!profile?.startup_record_id) throw new Error("Startup no encontrada");

  const num = (key: string) => {
    const v = formData.get(key) as string;
    return v ? Number(v) : undefined;
  };
  const str = (key: string) => (formData.get(key) as string) || undefined;

  await Promise.all([
    updateFounder(founder.id, {
      first_name: str("first_name") ?? founder.first_name,
      last_name: str("last_name") ?? founder.last_name,
      whatsapp: str("whatsapp"),
      linkedin_founder: str("linkedin_founder"),
      founder_role: str("founder_role"),
      country_residence: str("country_residence"),
      founder_team_women: str("founder_team_women"),
    }),
    updateStartup(profile.startup_record_id, {
      startup_name: str("startup_name"),
      startup_website: str("startup_website"),
      startup_linkedin: str("startup_linkedin"),
      startup_description: str("startup_description"),
      startup_country_ops: str("startup_country_ops"),
      startup_countries_expansion: str("startup_countries_expansion"),
      startup_usa_intl: str("startup_usa_intl"),
      startup_industries: str("startup_industries"),
      startup_stage: str("startup_stage"),
      business_model: str("business_model"),
      startup_team_size: num("startup_team_size"),
      startup_mrr: num("startup_mrr"),
      startup_sales_12m: num("startup_sales_12m"),
      prior_fundraising: str("prior_fundraising"),
      prior_fundraising_amount: num("prior_fundraising_amount"),
      round_open: str("round_open"),
      round_series: str("round_series"),
      round_size: num("round_size"),
      startup_valuation: num("startup_valuation"),
      round_tickets: str("round_tickets"),
      runway: num("runway"),
      deck_url: str("deck_url"),
    }),
  ]);

  revalidatePath("/portal/startup");
}

export async function actualizarMiembro(founderId: string, data: {
  first_name?: string;
  last_name?: string;
  whatsapp?: string;
  linkedin_founder?: string;
  founder_role?: string;
  country_residence?: string;
}) {
  const session = await obtenerSesion();
  if (!session) throw new Error("No autorizado");

  const profile = await getFounderProfile(session.email);
  const teamIds = (profile?.team ?? []).map((m) => m.id);
  if (!teamIds.includes(founderId)) throw new Error("No autorizado");

  await updateFounder(founderId, data);
  revalidatePath("/portal/equipo");
}
