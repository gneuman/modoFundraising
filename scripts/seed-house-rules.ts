/**
 * Seed: House Rules MF26
 * Crea las reglas del programa en Airtable.
 * Ejecutar: npx tsx scripts/seed-house-rules.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!
);

const TABLE = "House Rules MF26";

// ─── Datos ────────────────────────────────────────────────────────────────────

const houseRules = [
  {
    nro: 1,
    categoria: "Comunidad",
    titulo: "Lo que se habla en el programa, queda en el programa",
    descripcion: "Los founders comparten información sensible sobre sus rondas, números y procesos. Esa información es confidencial. No se comparte fuera del grupo ni en redes sociales.",
    icon: "🔒",
    obligatoria: true,
  },
  {
    nro: 2,
    categoria: "Comunidad",
    titulo: "No hay competencia, hay comunidad",
    descripcion: "Varios founders pueden estar levantando rondas similares al mismo tiempo. Eso no los hace competidores — los hace aliados. Ayudarse entre founders es una de las fuentes de valor más grandes del programa.",
    icon: "🤝",
    obligatoria: true,
  },
  {
    nro: 3,
    categoria: "Asistencia",
    titulo: "Las clases son en vivo por una razón",
    descripcion: "El valor del programa está en la interacción, no solo en el contenido. Las clases en vivo tienen preguntas, debates y feedback en tiempo real que no existe en la grabación. Comprometete a estar.",
    icon: "📡",
    obligatoria: false,
  },
  {
    nro: 4,
    categoria: "Asistencia",
    titulo: "Si no podés asistir, avisá",
    descripcion: "La vida pasa. Si no podés estar en una sesión, avisá con anticipación en el grupo. No es obligatorio, pero es respeto al equipo y a tus compañeros.",
    icon: "📢",
    obligatoria: false,
  },
  {
    nro: 5,
    categoria: "Misiones",
    titulo: "Las misiones son para hacerlas, no para tenerlas",
    descripcion: "Cada misión está diseñada para que la apliques directamente a tu proceso de fundraising. El que no hace las misiones no está en el programa — está viendo el programa. La diferencia es enorme.",
    icon: "🎯",
    obligatoria: true,
  },
  {
    nro: 6,
    categoria: "Misiones",
    titulo: "Compartir tu progreso en las sesiones Rockstar",
    descripcion: "Las sesiones Rockstar funcionan cuando todos comparten su avance. No tenés que tener todo perfecto — tenés que haber intentado. Compartir trabajo en progreso es parte del aprendizaje.",
    icon: "🚀",
    obligatoria: false,
  },
  {
    nro: 7,
    categoria: "Feedback",
    titulo: "El feedback es un regalo, no un ataque",
    descripcion: "En las sesiones de revisión de pitch decks y estrategias, el feedback puede ser duro. Está orientado a hacerte mejor, no a bajarte el ánimo. Recibilo y dalo desde ese lugar.",
    icon: "💬",
    obligatoria: false,
  },
  {
    nro: 8,
    categoria: "Feedback",
    titulo: "Llenar el formulario de feedback cada semana",
    descripcion: "El programa mejora con tu input. Tarda 2 minutos. Es la Tarea 1 de cada misión. Si algo no funciona, queremos saberlo — no para justificarnos, sino para arreglarlo.",
    icon: "📝",
    obligatoria: true,
  },
  {
    nro: 9,
    categoria: "Inversores",
    titulo: "No hacer cold outreach a inversores del programa sin permiso",
    descripcion: "Los VCs que participan como speakers o mentores lo hacen en un contexto específico. Contactarlos directamente sin una intro del equipo de Impacta VC puede quemar esa relación para todos. Siempre pedí la intro primero.",
    icon: "⚠️",
    obligatoria: true,
  },
  {
    nro: 10,
    categoria: "Inversores",
    titulo: "Ser honesto sobre el estado de tu ronda",
    descripcion: "No hay que inflar números ni fingir más tracción de la que tenés. Los inversores son muy buenos detectando esto — y cuando lo detectan, el daño es irreparable. La honestidad es la base de cualquier relación de inversión duradera.",
    icon: "🎯",
    obligatoria: true,
  },
  {
    nro: 11,
    categoria: "Comportamiento",
    titulo: "Respeto total — tolerancia cero",
    descripcion: "El programa es un espacio seguro para founders de todos los backgrounds. Cualquier forma de acoso, discriminación o conducta irrespetuosa resulta en expulsión inmediata sin reembolso.",
    icon: "🛡️",
    obligatoria: true,
  },
  {
    nro: 12,
    categoria: "Contenido",
    titulo: "No grabar ni redistribuir las sesiones",
    descripcion: "Las clases y masterclasses tienen derechos de autor. No está permitido grabar, descargar ni redistribuir el contenido fuera de la plataforma del programa.",
    icon: "🎬",
    obligatoria: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`Iniciando seed de House Rules MF26...\n`);
  log(`Creando ${houseRules.length} reglas...`);

  for (const rule of houseRules) {
    const fields: Record<string, unknown> = {
      nro: rule.nro,
      categoria: rule.categoria,
      titulo: rule.titulo,
      descripcion: rule.descripcion,
      icon: rule.icon,
      obligatoria: rule.obligatoria,
    };

    await base(TABLE).create(fields as never);
    log(`  ✓ Regla ${rule.nro}: ${rule.titulo}`);
  }

  log("\n✅ Seed completado. Revisá Airtable.");
}

main().catch((err) => {
  console.error("[seed] ERROR:", err);
  process.exit(1);
});
