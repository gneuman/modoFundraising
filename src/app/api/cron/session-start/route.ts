export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllClasesFresh, markClaseNotif, type ClaseRecord } from "@/lib/airtable";

// POST /api/cron/session-start
//
// Aviso "la sesión está empezando ahora". Gemelo de session-1h pero para el
// momento del arranque. Dispara desde n8n (Schedule cada ~15 min); el código
// revisa el estado de las clases y n8n postea a Slack.
//
// SOLO SLACK (decisión Gabriel 2026-07-06): los avisos de sesión son puro Slack
// para actualizar al canal. El correo queda solo para el aviso de misión
// (mision-activada). Este endpoint NO manda correo.
//
// Reparto (ver WI-1637 / WI-1635):
//   - Slack:  lo POSTEA n8n con el `slack[]` que devuelve este endpoint.
//   - Idempotencia: campo `notif_start_enviada_at` en `Clases MF26`.
//
// Disparo: una clase entra si (a) su `fecha` cae en [now-5min, now+10min], o
// (b) su `status` = "En vivo" — lo que ocurra primero — y no tiene
// `notif_start_enviada_at`.
//
// Modo prueba: body { test: true } → NO marca el flag (repetible).
//
// Auth: Authorization: Bearer <CRON_SECRET>.

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const SLACK_CHANNEL = process.env.SLACK_CANAL_COHORT ?? "#modo-fundraising";

const WINDOW_MIN_MINUTES = -5;  // hasta 5 min después de la hora de inicio
const WINDOW_MAX_MINUTES = 10;  // hasta 10 min antes

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

function minutesUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60);
}

type ClaseConNotif = ClaseRecord & { notif_start_enviada_at?: string };

async function getClasesPendientes(): Promise<ClaseConNotif[]> {
  const clases = await getAllClasesFresh();
  return clases.filter((c) => {
    if (c.notif_start_enviada_at) return false;
    if (c.status === "En vivo") return true;
    if (!c.fecha) return false;
    const mins = minutesUntil(c.fecha);
    return mins >= WINDOW_MIN_MINUTES && mins <= WINDOW_MAX_MINUTES;
  });
}

function founderLink(clase: ClaseRecord): string {
  // Link founder: SIEMPRE url_live (Streamyard), igual que session-notify. El
  // meet_link es residuo del flujo viejo de Google Meet (ya no se usa, OP-2156);
  // priorizarlo mandaba a los founders un link de Meet muerto en vez del vivo.
  return clase.url_live || clase.meet_link || `${APP_URL}/portal/clases`;
}

function buildSlackText(clase: ClaseRecord): string {
  const link = founderLink(clase);
  return [
    `🔴 *¡Empezamos ahora!* ${clase.titulo ?? "La sesión"}`,
    `🔗 <${link}|Entrar al vivo>`,
  ].join("\n");
}

async function markNotified(claseId: string): Promise<void> {
  await markClaseNotif(claseId, "notif_start_enviada_at").catch((e: unknown) => {
    console.error("[session-start] no se pudo marcar notif_start_enviada_at:", e instanceof Error ? e.message : e);
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { test?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // body vacío es válido
  }
  const isTest = body.test === true;

  const clases = await getClasesPendientes();

  const slack: { canal: string; texto: string }[] = [];
  const acciones: { claseId: string; titulo: string; marcada: boolean }[] = [];

  for (const clase of clases) {
    slack.push({ canal: SLACK_CHANNEL, texto: buildSlackText(clase) });

    if (!isTest) await markNotified(clase.id!);

    acciones.push({ claseId: clase.id!, titulo: clase.titulo ?? "", marcada: !isTest });
  }

  return NextResponse.json({
    ok: true,
    testMode: isTest ? "enabled (no marca flag, repetible)" : undefined,
    procesadas: clases.length,
    slack,
    acciones,
  });
}

// GET /api/cron/session-start — preview sin enviar.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clases = await getClasesPendientes();
  return NextResponse.json({
    count: clases.length,
    preview: clases.map((c) => ({
      claseId: c.id,
      titulo: c.titulo,
      fecha: c.fecha,
      status: c.status,
      slack_text: buildSlackText(c),
    })),
  });
}
