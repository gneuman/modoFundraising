import {
  getDesignTokens,
  getLandingTextos,
  getLandingCards,
  getHomeCasosExitoAll,
  getAdvisorsAll,
  getInstructores,
} from "@/lib/airtable";
import { DesignPageTabs } from "./design-page-tabs";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const [tokens, textos, outcomes, pillars, casos, advisors, instructores] = await Promise.all([
    getDesignTokens(),
    getLandingTextos(),
    getLandingCards("outcome"),
    getLandingCards("pillar"),
    getHomeCasosExitoAll(),
    getAdvisorsAll(),
    getInstructores(),
  ]);

  if (!tokens) {
    return <p className="text-zinc-500">No se encontró ningún registro activo en design_tokens.</p>;
  }

  return (
    <DesignPageTabs
      tokens={tokens}
      textos={textos}
      outcomes={outcomes}
      pillars={pillars}
      casos={casos}
      advisors={advisors}
      instructores={instructores}
    />
  );
}
