export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  resolveAsistenciaStreamYard,
  upsertAsistencia,
} from "@/lib/airtable";

// POST /api/streamyard/asistencia
//
// Recibe el webhook de StreamYard (vía Zapier) por cada asistente a una sesión en
// vivo y registra la asistencia LIGANDO clase + startup. Reemplaza al Zap anterior
// que creaba el registro sin `clase_record` y sin resolver la startup cuando el
// founder entraba con un correo distinto al de Airtable (OP-1923).
//
// El webhook llega como { body: "<texto tipo YAML>" } — el `body` es UN STRING con
// campos "clave: valor" por línea, incluyendo:
//   email, firstName, lastName, webinarId, webinarTitle, status, createdAt,
//   customFields: [{'name': 'Startup', 'value': '...'}]   ← lo escribe el founder (opcional)
//
// Resolución de STARTUP (cascada, email primero — el custom field es texto libre y
// no todos lo llenan, así que es solo respaldo):
//   1) email exacto → founder → startup
//   2) nombre de startup del customField → match EXACTO normalizado
//   3) firstName+lastName → founder → startup
//   4) sin match → 200 { resolved:false } (no reintentar; queda logueado)
//
// Resolución de CLASE: webinarTitle (keywords) con fallback a la fecha de createdAt.
//
// Registra POR STARTUP con dedup por clave natural (startup, clase).
//
// Auth: Authorization: Bearer <CRON_SECRET> (mismo secreto ya sincronizado con
// n8n/Zapier). Sin header válido → 401.

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

// Parsea el `body` string del webhook a los campos que nos interesan.
function parseStreamYardBody(body: string): {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  startup: string | null;
  webinarId: string | null;
  webinarTitle: string | null;
  status: string | null;
  createdAt: string | null;
} {
  const kv = new Map<string, string>();
  for (const line of body.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    kv.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }

  // customFields: [{'name': 'Startup', 'value': 'Foo'}]  (comillas simples)
  let startup: string | null = null;
  const cf = kv.get("customFields");
  if (cf) {
    try {
      const arr = JSON.parse(cf.replace(/'/g, '"')) as { name: string; value: string }[];
      startup = arr.find((c) => c.name?.toLowerCase() === "startup")?.value ?? null;
    } catch {
      const m = cf.match(/'name'\s*:\s*'Startup'\s*,\s*'value'\s*:\s*'([^']*)'/i);
      startup = m?.[1] ?? null;
    }
  }
  if (startup !== null && startup.trim() === "") startup = null;

  return {
    email: kv.get("email")?.toLowerCase().trim() || null,
    firstName: kv.get("firstName")?.trim() || null,
    lastName: kv.get("lastName")?.trim() || null,
    startup,
    webinarId: kv.get("webinarId")?.trim() || null,
    webinarTitle: kv.get("webinarTitle")?.trim() || null,
    status: kv.get("status")?.trim() || null,
    createdAt: kv.get("createdAt")?.trim() || null,
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Aceptar { body: "..." } (formato StreamYard) o el objeto ya parseado.
  const bodyStr =
    payload && typeof payload === "object" && "body" in payload
      ? String((payload as { body: unknown }).body)
      : null;
  if (!bodyStr) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }

  const a = parseStreamYardBody(bodyStr);

  // El trigger del Zap es "Update Registrant Status" → dispara en CADA cambio de
  // status, incluido "registered" (solo se registró, no asistió). Solo contamos
  // asistencia real. Enfoque robusto: rechazar explícitamente "registered" y
  // contar cualquier otro status (attended, joined, live, reorder, …) — así un
  // status de asistencia nuevo que StreamYard invente después igual cuenta. OP-1925.
  const statusNorm = (a.status ?? "").toLowerCase().trim();
  if (statusNorm === "registered") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "solo_registrado",
      email: a.email,
      status: a.status,
    });
  }

  const resolved = await resolveAsistenciaStreamYard({
    email: a.email,
    firstName: a.firstName,
    lastName: a.lastName,
    startupName: a.startup,
    webinarTitle: a.webinarTitle,
    createdAt: a.createdAt,
  });

  if (!resolved.startupId || !resolved.claseId) {
    // 200 a propósito: no queremos que Zapier reintente indefinidamente un
    // asistente que no podemos ligar (correo desconocido / startup no escrita).
    // Queda logueado para reconciliación manual con el script de backfill.
    return NextResponse.json({
      ok: true,
      resolved: false,
      reason: !resolved.claseId ? "no_clase" : "no_startup",
      email: a.email,
      startupName: a.startup,
      webinarTitle: a.webinarTitle,
    });
  }

  await upsertAsistencia({
    startupId: resolved.startupId,
    claseId: resolved.claseId,
    asistio: true,
    fecha: (a.createdAt ?? new Date().toISOString()).slice(0, 10),
    notas: `StreamYard: ${a.webinarTitle ?? ""}`,
  });

  return NextResponse.json({
    ok: true,
    resolved: true,
    startupId: resolved.startupId,
    claseId: resolved.claseId,
    viaStartup: resolved.viaStartup,
    viaClase: resolved.viaClase,
  });
}
