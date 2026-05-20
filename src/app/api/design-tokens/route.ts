import { NextResponse } from "next/server";
import { getDesignTokens } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const tokens = await getDesignTokens();

  const t = tokens ?? {
    color_primary: "#ff0080",
    color_secondary: "#ff8a3c",
    color_teal: "#5eead4",
    color_violet: "#c4b5fd",
    color_bg: "#0a0f23",
    color_bg_deep: "#050816",
    impacta_green: "#10b981",
    impacta_green_deep: "#047857",
    font_family: "Inter",
  };

  const css = `
:root {
  --pink: ${t.color_primary};
  --orange: ${t.color_secondary};
  --teal: ${t.color_teal};
  --violet: ${t.color_violet};
  --bg: ${t.color_bg};
  --bg-deep: ${t.color_bg_deep};
  --impacta-green: ${t.impacta_green};
  --impacta-green-deep: ${t.impacta_green_deep};
  --font-family: '${t.font_family}', -apple-system, BlinkMacSystemFont, sans-serif;
}
`.trim();

  return new NextResponse(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
