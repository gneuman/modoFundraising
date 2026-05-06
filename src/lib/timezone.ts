export const TZ = "America/Santiago";

// Formatea fecha larga con hora: "lunes, 5 de mayo · 12:00 p. m."
export function formatFecha(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

// Formatea fecha larga con año y hora
export function formatFechaConAnio(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Formatea fecha corta con hora: "5 may · 12:00 p. m."
export function formatFechaCorta(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

// Solo hora: "12:00 p. m."
export function formatHora(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("es-MX", {
    timeZone: TZ,
    hour: "2-digit", minute: "2-digit",
  });
}

// Solo fecha sin hora: "lunes, 5 de mayo de 2026"
export function formatFechaSinHora(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    weekday: "long", day: "numeric", month: "long",
  });
}

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

// Date-only string "YYYY-MM-DD" → UTC ISO (medianoche Santiago)
export function dateOnlyToISO(dateStr: string): string {
  if (!dateStr) return "";
  return santiagoInputToISO(dateStr + "T00:00");
}

// UTC ISO → date-only string "YYYY-MM-DD" in Santiago time
export function toSantiagoDate(iso?: string): string {
  if (!iso) return "";
  return toSantiagoInput(iso).slice(0, 10);
}

// Add N days to a UTC ISO string, return datetime-local string in Santiago
export function addDaysSantiago(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return toSantiagoInput(d.toISOString());
}
