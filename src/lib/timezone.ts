const TZ = "America/Santiago";

// UTC ISO → datetime-local string in Santiago time
export function toSantiagoInput(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16);
}

// datetime-local string (Santiago) → UTC ISO string for Airtable
export function santiagoInputToISO(localStr: string): string {
  if (!localStr) return "";
  // Get the UTC offset for Santiago at approximately this time
  const probe = new Date(localStr + "Z"); // treat as UTC to probe the offset
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const match = tzName.match(/GMT([+-]\d+)/);
  const h = match ? parseInt(match[1]) : -3;
  const offset = `${h >= 0 ? "+" : "-"}${String(Math.abs(h)).padStart(2, "0")}:00`;
  return new Date(`${localStr}:00${offset}`).toISOString();
}

// Add N days to a UTC ISO string, return datetime-local string in Santiago
export function addDaysSantiago(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return toSantiagoInput(d.toISOString());
}
