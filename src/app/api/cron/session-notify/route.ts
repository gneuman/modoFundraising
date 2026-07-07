export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  getClaseByIdFresh,
  markClaseNotif,
  type ClaseRecord,
} from "@/lib/airtable";
import { formatFecha } from "@/lib/timezone";

// POST /api/cron/session-notify
//
// Aviso de sesión al canal de Slack. n8n dispara con el `recordId` de la clase
// y el `tipo` de aviso; este endpoint arma el texto de Slack y lo devuelve para
// que n8n lo postee (no hay bot en el repo). El correo NO se manda aquí — los
// avisos de sesión son puro Slack (el correo queda solo para misiones).
//
// Modelo (decisión Gabriel 2026-07-06): n8n conoce el horario de las clases y
// dispara a la hora correcta pasando el recordId. El código NO adivina ventanas
// de tiempo — solo arma el mensaje del registro que le pasan.
//
// Body:
//   {
//     recordId: string,           // id de la clase en `Clases MF26`
//     tipo: "1h" | "start" | "24h",
//     test?: boolean              // si true, NO marca el flag (repetible)
//   }
//
// Tipos de aviso:
//   - "1h"    → "En 1 hora empieza…"      (n8n dispara ~1h antes)
//   - "start" → "¡Empezamos ahora!"        (n8n dispara a la hora de inicio)
//   - "24h"   → "Mañana es la sesión…"     (n8n dispara el día anterior)
//
// Idempotencia: campo por tipo en `Clases MF26`
//   notif_1h_enviada_at | notif_start_enviada_at | notif_24h_enviada_at.
// Si ya está marcado → responde { skipped } sin devolver Slack (evita repost si
// n8n dispara dos veces el mismo recordId+tipo). En modo test se ignora.
//
// Devuelve `slack: { canal, texto }` → n8n lo rutea a su nodo Slack.
//
// Auth: Authorization: Bearer <CRON_SECRET>.

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const SLACK_CHANNEL = process.env.SLACK_CANAL_COHORT ?? "#modo-fundraising";

type Tipo = "1h" | "start" | "24h";

const FLAG_BY_TIPO: Record<Tipo, "notif_1h_enviada_at" | "notif_start_enviada_at" | "notif_24h_enviada_at"> = {
  "1h": "notif_1h_enviada_at",
  start: "notif_start_enviada_at",
  "24h": "notif_24h_enviada_at",
};

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

// Link founder: SIEMPRE url_live (Streamyard). El meet_link es la reunión
// interna y NO debe filtrarse al canal. Fallback al portal si no hay url_live.
function founderLink(clase: ClaseRecord): string {
  return clase.url_live || `${APP_URL}/portal/clases`;
}

function buildSlackText(clase: ClaseRecord, tipo: Tipo): string {
  const titulo = clase.titulo ?? "la sesión";
  const link = founderLink(clase);
  const cuando = formatFecha(clase.fecha) ?? "";

  if (tipo === "start") {
    return [
      `🔴 *¡Empezamos ahora!* ${titulo}`,
      `🔗 <${link}|Entrar al vivo>`,
    ].join("\n");
  }
  if (tipo === "24h") {
    return [
      `📅 *Mañana es la sesión:* ${titulo}`,
      cuando ? `🗓️ ${cuando}` : "",
      `💡 Aprovecha para *preparar tus preguntas* — mientras más específicas, más valor sacas del vivo.`,
      `🔗 <${link}|Ver detalles en el portal>`,
    ].filter(Boolean).join("\n");
  }
  // "1h"
  return [
    `⏰ *En 1 hora empieza:* ${titulo}`,
    cuando ? `🗓️ ${cuando}` : "",
    `🔗 <${link}|Entrar a la sesión>`,
  ].filter(Boolean).join("\n");
}

function isTipo(v: unknown): v is Tipo {
  return v === "1h" || v === "start" || v === "24h";
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { recordId?: string; tipo?: string; test?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recordId = body.recordId?.trim();
  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }
  if (!isTipo(body.tipo)) {
    return NextResponse.json({ error: 'tipo required: "1h" | "start" | "24h"' }, { status: 400 });
  }
  const tipo = body.tipo;
  const isTest = body.test === true;

  const clase = await getClaseByIdFresh(recordId);
  if (!clase) {
    return NextResponse.json({ error: "Clase not found", recordId }, { status: 404 });
  }

  const flag = FLAG_BY_TIPO[tipo];

  // Idempotencia: si ya se avisó este (clase, tipo) y no es test → skip.
  const yaNotificada = (clase as Record<string, unknown>)[flag] as string | undefined;
  if (yaNotificada && !isTest) {
    return NextResponse.json({
      ok: true,
      skipped: `ya se notificó (${tipo}) el ${yaNotificada}`,
      recordId,
    });
  }

  const slack = { canal: SLACK_CHANNEL, texto: buildSlackText(clase, tipo) };

  // Marca el flag ANTES de que n8n postee — si n8n reintenta el mismo
  // recordId+tipo, el gate de arriba responde skipped. En test no se marca.
  let marcada = false;
  if (!isTest) {
    await markClaseNotif(recordId, flag)
      .then(() => { marcada = true; })
      .catch((e: unknown) => {
        console.error(`[session-notify] no se pudo marcar ${flag}:`, e instanceof Error ? e.message : e);
      });
  }

  return NextResponse.json({
    ok: true,
    recordId,
    tipo,
    titulo: clase.titulo,
    fecha: clase.fecha,
    testMode: isTest ? "enabled (no marca flag, repetible)" : undefined,
    marcada,
    slack, // ← n8n rutea esto a su nodo Slack
  });
}

// GET /api/cron/session-notify?recordId=...&tipo=1h
// Preview: arma el texto de Slack sin marcar el flag ni enviar nada.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId")?.trim();
  const tipoRaw = searchParams.get("tipo");
  if (!recordId) {
    return NextResponse.json({ error: "recordId required (query param)" }, { status: 400 });
  }
  if (!isTipo(tipoRaw)) {
    return NextResponse.json({ error: 'tipo required (query param): "1h" | "start" | "24h"' }, { status: 400 });
  }
  const clase = await getClaseByIdFresh(recordId);
  if (!clase) {
    return NextResponse.json({ error: "Clase not found", recordId }, { status: 404 });
  }
  return NextResponse.json({
    recordId,
    tipo: tipoRaw,
    titulo: clase.titulo,
    fecha: clase.fecha,
    ya_notificada: (clase as Record<string, unknown>)[FLAG_BY_TIPO[tipoRaw]] ?? null,
    slack_text: buildSlackText(clase, tipoRaw),
  });
}
