export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllClasesFresh, markClaseNotif, getAllFoundersWithAccess, type ClaseRecord } from "@/lib/airtable";
import { sendSesionRecordatorioEmail } from "@/lib/email-engine";
import { formatFecha } from "@/lib/timezone";

// POST /api/cron/session-1h
//
// Aviso "la sesión empieza en ~1 hora". Pensado para dispararse desde n8n
// (Schedule trigger cada ~15 min) — el CÓDIGO revisa el estado de las clases
// y decide qué notificar; n8n solo dispara y postea a Slack.
//
// Reparto (decisión Gabriel 2026-07-06, ver WI-1636 / WI-1635):
//   - Slack:  lo POSTEA n8n. Este endpoint NO integra Slack; devuelve en el
//             JSON el/los mensajes ya armados en `slack[]` para que n8n los
//             rutee a su nodo Slack (con su propia auth).
//   - Correo: lo manda ESTE endpoint (Gmail vía email-engine).
//   - Idempotencia: campo `notif_1h_enviada_at` en `Clases MF26`.
//
// Ventana: una clase entra si su `fecha` cae en [now+45min, now+75min] y no
// tiene `notif_1h_enviada_at`. La ventana ±15min absorbe el jitter del cron.
//
// Modo prueba:
//   - body { testEmail: "x@y.com" } → el correo se manda SOLO a ese email,
//     NO se marca `notif_1h_enviada_at` (repetible) y el Slack se devuelve
//     igual para que puedas ver el texto. No spamea al cohort.
//
// Auth: Authorization: Bearer <CRON_SECRET>.

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const SLACK_CHANNEL = process.env.SLACK_CANAL_COHORT ?? "#modo-fundraising";

// Ventana de disparo alrededor de la marca "1h antes".
const WINDOW_MIN_MINUTES = 45;
const WINDOW_MAX_MINUTES = 75;

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

function minutesUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60);
}

type ClaseConNotif = ClaseRecord & { notif_1h_enviada_at?: string };

async function getClasesPendientes(): Promise<ClaseConNotif[]> {
  const clases = await getAllClasesFresh();
  return clases.filter((c) => {
    if (!c.fecha || c.notif_1h_enviada_at) return false;
    const mins = minutesUntil(c.fecha);
    return mins >= WINDOW_MIN_MINUTES && mins <= WINDOW_MAX_MINUTES;
  });
}

// Link founder: preferimos el meet_link; fallback al url_live (Streamyard).
function founderLink(clase: ClaseRecord): string {
  return clase.meet_link || clase.url_live || `${APP_URL}/portal/clases`;
}

function buildSlackText(clase: ClaseRecord): string {
  const hora = formatFecha(clase.fecha) ?? "";
  const link = founderLink(clase);
  return [
    `⏰ *En 1 hora empieza:* ${clase.titulo ?? "la próxima sesión"}`,
    hora ? `🗓️ ${hora}` : "",
    `🔗 <${link}|Entrar a la sesión>`,
  ].filter(Boolean).join("\n");
}

async function markNotified(claseId: string): Promise<void> {
  await markClaseNotif(claseId, "notif_1h_enviada_at").catch((e: unknown) => {
    console.error("[session-1h] no se pudo marcar notif_1h_enviada_at:", e instanceof Error ? e.message : e);
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { testEmail?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body vacío es válido (n8n puede no mandar body)
  }
  const testEmail = body.testEmail?.trim();

  const clases = await getClasesPendientes();

  const slack: { canal: string; texto: string }[] = [];
  const acciones: { claseId: string; titulo: string; correos: number; marcada: boolean }[] = [];

  // Destinatarios del correo: en test, solo el testEmail. Si no, founders activos.
  const founders = testEmail
    ? [{ email: testEmail, first_name: "test" }]
    : (await getAllFoundersWithAccess()).map((f) => ({ email: f.email, first_name: f.first_name }));

  for (const clase of clases) {
    // 1) Slack para n8n (siempre se arma, también en test)
    slack.push({ canal: SLACK_CHANNEL, texto: buildSlackText(clase) });

    // 2) Correo a founders
    const link = founderLink(clase);
    const hora = formatFecha(clase.fecha) ?? "";
    let correos = 0;
    await Promise.allSettled(
      founders.map((f) =>
        sendSesionRecordatorioEmail(f.email, f.first_name || "founder", {
          titulo: clase.titulo ?? "Sesión Modo Fundraising",
          cuando: hora,
          link,
          modo: "1h",
        }).then(() => { correos += 1; }),
      ),
    );

    // 3) Idempotencia — NO marcar en modo test (repetible)
    if (!testEmail) await markNotified(clase.id!);

    acciones.push({
      claseId: clase.id!,
      titulo: clase.titulo ?? "",
      correos,
      marcada: !testEmail,
    });
  }

  return NextResponse.json({
    ok: true,
    testMode: testEmail ? `enabled (correo solo a ${testEmail}, sin marcar flag)` : undefined,
    procesadas: clases.length,
    slack,      // ← n8n rutea esto a su nodo Slack
    acciones,
  });
}

// GET /api/cron/session-1h — preview: qué se notificaría ahora, sin enviar.
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
      minutos_para_empezar: Math.round(minutesUntil(c.fecha!)),
      slack_text: buildSlackText(c),
    })),
  });
}
