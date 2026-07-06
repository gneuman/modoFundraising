export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllClasesFresh, markClaseNotif, type ClaseRecord } from "@/lib/airtable";
import { formatFecha } from "@/lib/timezone";

// POST /api/cron/session-24h
//
// Recordatorio "la sesión es mañana — prepara tus preguntas". Pensado para un
// cron DIARIO en n8n (una vez al día, ej. a media tarde). El código revisa qué
// clases caen mañana y no fueron avisadas; n8n dispara y postea a Slack.
//
// SOLO SLACK (decisión Gabriel 2026-07-06): los avisos de sesión son puro Slack
// para actualizar al canal. El correo queda solo para el aviso de misión
// (mision-activada). Este endpoint NO manda correo.
//
// Reparto (ver WI-1638 / WI-1635):
//   - Slack:  lo POSTEA n8n con el `slack[]` que devuelve este endpoint.
//   - Idempotencia: campo `notif_24h_enviada_at` en `Clases MF26`.
//
// Ventana: una clase entra si su `fecha` está entre [now+20h, now+30h] y no
// tiene `notif_24h_enviada_at`. La ventana ±5h alrededor de las 24h absorbe la
// hora a la que n8n dispara el cron diario (no tiene que ser exactamente -24h).
//
// Nota sobre "los jueves": el pedido original hablaba de las sesiones de los
// jueves, pero como las clases MF26 caen (hoy) los jueves, filtrar por "mañana"
// las cubre sin hardcodear el día de la semana. Si en el futuro hay clases en
// otros días y solo se quiere avisar las de jueves, agregar un check de weekday.
//
// Modo prueba: body { test: true } → NO marca el flag (repetible), devuelve el
// slack igual para revisar el copy.
//
// Auth: Authorization: Bearer <CRON_SECRET>.

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const SLACK_CHANNEL = process.env.SLACK_CANAL_COHORT ?? "#modo-fundraising";

const WINDOW_MIN_HOURS = 20;
const WINDOW_MAX_HOURS = 30;

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
}

type ClaseConNotif = ClaseRecord & { notif_24h_enviada_at?: string };

async function getClasesPendientes(): Promise<ClaseConNotif[]> {
  const clases = await getAllClasesFresh();
  return clases.filter((c) => {
    if (!c.fecha || c.notif_24h_enviada_at) return false;
    const h = hoursUntil(c.fecha);
    return h >= WINDOW_MIN_HOURS && h <= WINDOW_MAX_HOURS;
  });
}

function buildSlackText(clase: ClaseRecord): string {
  const cuando = formatFecha(clase.fecha) ?? "";
  const link = `${APP_URL}/portal/clases`;
  return [
    `📅 *Mañana es la sesión:* ${clase.titulo ?? ""}`,
    cuando ? `🗓️ ${cuando}` : "",
    `💡 Aprovecha para *preparar tus preguntas* — mientras más específicas, más valor sacas del vivo.`,
    `🔗 <${link}|Ver detalles en el portal>`,
  ].filter(Boolean).join("\n");
}

async function markNotified(claseId: string): Promise<void> {
  await markClaseNotif(claseId, "notif_24h_enviada_at").catch((e: unknown) => {
    console.error("[session-24h] no se pudo marcar notif_24h_enviada_at:", e instanceof Error ? e.message : e);
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

    // Idempotencia — NO marcar en modo test (repetible)
    if (!isTest) await markNotified(clase.id!);

    acciones.push({ claseId: clase.id!, titulo: clase.titulo ?? "", marcada: !isTest });
  }

  return NextResponse.json({
    ok: true,
    testMode: isTest ? "enabled (no marca flag, repetible)" : undefined,
    procesadas: clases.length,
    slack,      // ← n8n rutea esto a su nodo Slack
    acciones,
  });
}

// GET /api/cron/session-24h — preview sin enviar.
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
      horas_para_empezar: Math.round(hoursUntil(c.fecha!)),
      slack_text: buildSlackText(c),
    })),
  });
}
