/**
 * Seed: Live Interviews MF26
 * Crea los registros de entrevistas en vivo con inversores en Airtable.
 * Ejecutar: npx tsx scripts/seed-live-interviews.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!
);

const TABLE = "Live Interviews MF26";

// ─── Datos ────────────────────────────────────────────────────────────────────
// Una live interview por semana, típicamente el jueves o viernes
// El format es: un founder exitoso o un VC en conversación abierta con David Alvo

const liveInterviews = [
  {
    nro: 1,
    titulo: "Live Interview: Founder que levantó seed en 60 días",
    speaker: "Por confirmar",
    speaker_empresa: "Portfolio Impacta VC",
    speaker_rol: "Founder & CEO",
    descripcion: "Conversación abierta con un founder del portfolio sobre su proceso de fundraising: qué hizo diferente, cómo construyó el pipeline y cómo manejó los rechazos.",
    fecha: "2026-07-03",
    horario: "12:00 - 13:00",
    semana: 1,
    tipo: "Founder Story",
    status: "Por confirmar",
  },
  {
    nro: 2,
    titulo: "Live Interview: VC LatAm — Qué busco en un seed deal",
    speaker: "Por confirmar",
    speaker_empresa: "Fondo Seed LatAm",
    speaker_rol: "General Partner",
    descripcion: "Un GP comparte su tesis de inversión, cómo evalúa founders en la primera reunión, y qué hace que un deal pase de interesante a cerrado.",
    fecha: "2026-07-10",
    horario: "12:00 - 13:00",
    semana: 2,
    tipo: "VC Perspective",
    status: "Por confirmar",
  },
  {
    nro: 3,
    titulo: "Live Interview: Cómo construí mi pitch deck ganador",
    speaker: "Por confirmar",
    speaker_empresa: "Startup LatAm",
    speaker_rol: "Co-founder",
    descripcion: "Un founder muestra en vivo su pitch deck real, explica qué cambió en cada iteración y responde preguntas del grupo sobre cómo mejorar sus propios decks.",
    fecha: "2026-07-17",
    horario: "12:00 - 13:00",
    semana: 3,
    tipo: "Deck Review",
    status: "Por confirmar",
  },
  {
    nro: 4,
    titulo: "Live Interview: Angel Investor — El proceso de decisión",
    speaker: "Por confirmar",
    speaker_empresa: "Angel Network",
    speaker_rol: "Angel Investor",
    descripcion: "Un inversor ángel activo en LatAm explica cómo evalúa deals en etapa pre-seed, qué documentos pide, y cómo los founders pueden acercarse efectivamente.",
    fecha: "2026-07-24",
    horario: "12:00 - 13:00",
    semana: 4,
    tipo: "Investor AMA",
    status: "Por confirmar",
  },
  {
    nro: 5,
    titulo: "Live Interview: Levantando capital con tracción mínima",
    speaker: "Por confirmar",
    speaker_empresa: "Portfolio Impacta VC",
    speaker_rol: "Founder",
    descripcion: "Un founder que cerró su ronda con poco más que un MVP y visión cuenta cómo convirtió la narrativa en su principal activo cuando los números aún eran pequeños.",
    fecha: "2026-07-31",
    horario: "12:00 - 13:00",
    semana: 5,
    tipo: "Founder Story",
    status: "Por confirmar",
  },
  {
    nro: 6,
    titulo: "Live Interview: Partner de Kaszek — Qué mueve el needle en LatAm",
    speaker: "Por confirmar",
    speaker_empresa: "Kaszek",
    speaker_rol: "Partner",
    descripcion: "Conversación con un partner de uno de los fondos más activos en LatAm sobre el estado del ecosistema, qué sectores les interesan y cómo piensan el pricing en seed.",
    fecha: "2026-08-07",
    horario: "12:00 - 13:00",
    semana: 6,
    tipo: "VC Perspective",
    status: "Por confirmar",
  },
  {
    nro: 7,
    titulo: "Live Interview: Cold outreach que convirtió — Casos reales",
    speaker: "Por confirmar",
    speaker_empresa: "Startup B2B LatAm",
    speaker_rol: "Founder & CEO",
    descripcion: "Un founder comparte los cold emails reales que le generaron reuniones con VCs de primer nivel. Análisis en vivo de qué funcionó y por qué.",
    fecha: "2026-08-14",
    horario: "12:00 - 13:00",
    semana: 7,
    tipo: "Tactic Deep Dive",
    status: "Por confirmar",
  },
  {
    nro: 8,
    titulo: "Live Interview: Cómo conseguí mi lead investor",
    speaker: "Por confirmar",
    speaker_empresa: "Portfolio Impacta VC",
    speaker_rol: "Founder",
    descripcion: "Un founder explica el proceso exacto que siguió para identificar, acercarse y convencer a su lead investor — incluyendo los errores que cometió en el camino.",
    fecha: "2026-08-21",
    horario: "12:00 - 13:00",
    semana: 8,
    tipo: "Founder Story",
    status: "Por confirmar",
  },
  {
    nro: 9,
    titulo: "Live Interview: Due Diligence desde adentro",
    speaker: "Por confirmar",
    speaker_empresa: "Firma Legal VC",
    speaker_rol: "Partner",
    descripcion: "Un especialista legal en transacciones de VC explica el proceso de DD paso a paso: qué documentos piden, cuánto dura, y cómo prepararse para no frenar el cierre.",
    fecha: "2026-08-28",
    horario: "12:00 - 13:00",
    semana: 9,
    tipo: "Expert Session",
    status: "Por confirmar",
  },
  {
    nro: 10,
    titulo: "Live Interview: Negociando valuación — El arte del no inmediato",
    speaker: "Por confirmar",
    speaker_empresa: "Fondo Pre-seed",
    speaker_rol: "General Partner",
    descripcion: "Un GP comparte cómo piensa la valuación desde el lado del fondo, qué argumentos le funcionan a los founders, y cuándo tiene sentido ceder vs. mantener el número.",
    fecha: "2026-09-04",
    horario: "12:00 - 13:00",
    semana: 10,
    tipo: "Negotiation",
    status: "Por confirmar",
  },
  {
    nro: 11,
    titulo: "Live Interview: Cómo generé FOMO entre 5 fondos en simultáneo",
    speaker: "Por confirmar",
    speaker_empresa: "Startup SaaS LatAm",
    speaker_rol: "Founder",
    descripcion: "Un founder que manejó un proceso competitivo con múltiples fondos interesados explica en detalle cómo generó urgencia sin mentir y cómo coordinó los tiempos.",
    fecha: "2026-09-11",
    horario: "12:00 - 13:00",
    semana: 11,
    tipo: "Tactic Deep Dive",
    status: "Por confirmar",
  },
  {
    nro: 12,
    titulo: "Live Interview: Panel de cierre — 3 VCs, 30 preguntas",
    speaker: "Panel de 3 inversores",
    speaker_empresa: "Fondos activos LatAm",
    speaker_rol: "GPs",
    descripcion: "Sesión final abierta con un panel de 3 VCs. Los founders del programa hacen las preguntas. Sin filtros, sin PR.",
    fecha: "2026-09-25",
    horario: "12:00 - 13:30",
    semana: 12,
    tipo: "Panel AMA",
    status: "Por confirmar",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`Iniciando seed de Live Interviews MF26...\n`);
  log(`Creando ${liveInterviews.length} live interviews...`);

  for (const li of liveInterviews) {
    const fields: Record<string, unknown> = {
      titulo: `LI${li.nro} — ${li.tipo}: ${li.titulo.replace("Live Interview: ", "")}`,
      descripcion: li.descripcion,
      speaker: li.speaker,
      speaker_empresa: li.speaker_empresa,
      speaker_rol: li.speaker_rol,
      fecha: li.fecha,
      horario: li.horario,
      semana: li.semana,
      tipo: li.tipo,
      status: li.status,
    };

    await base(TABLE).create(fields as never);
    log(`  ✓ LI${li.nro}: ${li.titulo} (${li.fecha})`);
  }

  log("\n✅ Seed completado. Revisa Airtable.");
}

main().catch((err) => {
  console.error("[seed] ERROR:", err);
  process.exit(1);
});
