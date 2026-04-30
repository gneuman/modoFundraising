"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, updateStartup } from "@/lib/airtable";

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
