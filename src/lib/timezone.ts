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
  // Iterative approach: probe with an estimated UTC time, then correct using
  // the actual offset returned for that UTC time. One iteration is enough
  // because Santiago's DST transitions never happen at the exact boundary.
  const probe1 = new Date(localStr + "Z"); // first pass: treat local as UTC
  const getOffset = (d: Date): number => {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: TZ,
      timeZoneName: "shortOffset",
    }).formatToParts(d);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-4";
    const match = tzName.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!match) return -4;
    const h = parseInt(match[1]);
    const m = match[2] ? parseInt(match[2]) : 0;
    return h < 0 ? h - m / 60 : h + m / 60;
  };
  const offset1 = getOffset(probe1);
  // Shift the probe by the estimated offset to get closer to real UTC
  const probe2 = new Date(probe1.getTime() - offset1 * 3600000);
  const offset2 = getOffset(probe2);
  const absH = Math.abs(offset2);
  const hh = String(Math.floor(absH)).padStart(2, "0");
  const mm = String(Math.round((absH % 1) * 60)).padStart(2, "0");
  const sign = offset2 >= 0 ? "+" : "-";
  return new Date(`${localStr}:00${sign}${hh}:${mm}`).toISOString();
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
