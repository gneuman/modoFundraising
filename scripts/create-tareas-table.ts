/**
 * Crea la tabla "Tareas MF26" en Airtable con los campos necesarios
 * y luego la pobla con las tareas de cada misión (incluyendo la tarea NPS).
 *
 * Ejecutar: npx tsx scripts/create-tareas-table.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const base = new Airtable({ apiKey: PAT }).base(BASE_ID);

function log(msg: string) { console.log(`[tareas] ${msg}`); }

// ─── 1. Crear tabla via Meta API ──────────────────────────────────────────────

async function crearTabla() {
  log("Creando tabla 'Tareas MF26'...");

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Tareas MF26",
      description: "Tareas individuales de cada misión del programa",
      fields: [
        { name: "titulo", type: "singleLineText" },
        { name: "descripcion", type: "multilineText" },
        {
          name: "tipo",
          type: "singleSelect",
          options: {
            choices: [
              { name: "NPS" },
              { name: "Entrega" },
              { name: "Checklist" },
            ],
          },
        },
        { name: "orden", type: "number", options: { precision: 0 } },
        // Links se agregan después — Airtable no permite linked fields en creación de tabla
      ],
    }),
  });

  const data = await res.json() as { id?: string; error?: { type: string; message: string } };
  if (!res.ok) {
    if (data.error?.type === "TABLE_EXISTS" || data.error?.message?.includes("already exists")) {
      log("La tabla ya existe, continuando...");
      // Buscar el id de la tabla existente
      const schema = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
        headers: { Authorization: `Bearer ${PAT}` },
      }).then((r) => r.json()) as { tables: { id: string; name: string }[] };
      const existing = schema.tables.find((t) => t.name === "Tareas MF26");
      return existing?.id ?? null;
    }
    throw new Error(`Error creando tabla: ${JSON.stringify(data)}`);
  }

  log(`  ✓ Tabla creada: ${data.id}`);
  return data.id!;
}

// ─── 2. Agregar campos linked records ────────────────────────────────────────

async function agregarLinkedFields(tableId: string) {
  // Obtener IDs de las tablas Misiones y Clases
  const schema = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  }).then((r) => r.json()) as { tables: { id: string; name: string }[] };

  const misionesId = schema.tables.find((t) => t.name === "Misiones MF26")?.id;
  const clasesId = schema.tables.find((t) => t.name === "Clases MF26")?.id;

  if (!misionesId || !clasesId) throw new Error("No se encontraron tablas Misiones o Clases");

  log(`  Misiones MF26 id: ${misionesId}`);
  log(`  Clases MF26 id: ${clasesId}`);

  // Agregar linked field a Misiones
  log("Agregando campo 'mision' (linked to Misiones MF26)...");
  const r1 = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "mision",
      type: "multipleRecordLinks",
      options: { linkedTableId: misionesId },
    }),
  });
  const d1 = await r1.json();
  if (!r1.ok) log(`  ⚠ mision field: ${JSON.stringify(d1)}`);
  else log(`  ✓ Campo 'mision' creado`);

  // Agregar linked field a Clases (para NPS — qué clases evalúa esta tarea)
  log("Agregando campo 'clases_nps' (linked to Clases MF26)...");
  const r2 = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "clases_nps",
      type: "multipleRecordLinks",
      options: { linkedTableId: clasesId },
    }),
  });
  const d2 = await r2.json();
  if (!r2.ok) log(`  ⚠ clases_nps field: ${JSON.stringify(d2)}`);
  else log(`  ✓ Campo 'clases_nps' creado`);
}

// ─── 3. Seed de tareas ────────────────────────────────────────────────────────

// Datos de las 12 misiones con sus tareas
// clase_nro_teoria y clase_nro_rockstar son los números de clase de esa semana
const misionesData = [
  {
    mision_titulo: "Misión 1: Onboarding",
    clase_nro_teoria: 1,  // Program Launch
    clase_nro_rockstar: 2, // Rockstar Launch
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Checklist", titulo: "Completar perfil en el portal", descripcion: "Subir foto, bio, LinkedIn y rol dentro de la startup." },
      { orden: 3, tipo: "Checklist", titulo: "Presentarse en la comunidad", descripcion: "Publicar tu presentación en el grupo de WhatsApp/Slack del programa." },
      { orden: 4, tipo: "Entrega", titulo: "Agendar 1:1 de bienvenida", descripcion: "Coordinar y realizar el 1:1 de onboarding con el equipo de Modo Fundraising." },
    ],
  },
  {
    mision_titulo: "Misión 2: Techstack",
    clase_nro_teoria: 3,
    clase_nro_rockstar: 4,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Configurar CRM de inversores", descripcion: "Elegir y configurar tu CRM (Notion, Airtable, HubSpot u otro) con las etapas del pipeline definidas en clase." },
      { orden: 3, tipo: "Entrega", titulo: "Crear pipeline de seguimiento", descripcion: "Definir y documentar las etapas: Identificado → Contactado → Respondió → Reunión → En proceso → Cerrado." },
      { orden: 4, tipo: "Entrega", titulo: "Documentar elecciones de techstack", descripcion: "Registrar qué herramientas elegiste y por qué. Compartir en la sesión Rockstar." },
    ],
  },
  {
    mision_titulo: "Misión 3: Strategy",
    clase_nro_teoria: 5,
    clase_nro_rockstar: 6,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Definir tesis de inversión", descripcion: "Redactar en 1 párrafo la tesis de tu ronda: por qué ahora, para qué, y quién es tu inversor ideal." },
      { orden: 3, tipo: "Entrega", titulo: "Calcular unit economics clave", descripcion: "Documentar CAC, LTV, MRR, runway y cualquier métrica relevante para tu modelo." },
      { orden: 4, tipo: "Entrega", titulo: "Documentar uso de fondos", descripcion: "Breakdown detallado de en qué se gastará el capital recaudado (% por área o iniciativa)." },
    ],
  },
  {
    mision_titulo: "Misión 4: Storytelling",
    clase_nro_teoria: 7,
    clase_nro_rockstar: 8,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Escribir la historia del fundador", descripcion: "Redactar en 200 palabras: por qué fundaste esto, qué problema viviste en carne propia, qué te hace la persona correcta." },
      { orden: 3, tipo: "Entrega", titulo: "Definir la visión en una frase", descripcion: "Una frase que capture el futuro que tu startup está construyendo. Debe resonar con un inversor en 10 segundos." },
      { orden: 4, tipo: "Entrega", titulo: "Grabar elevator pitch de 60 segundos", descripcion: "Video selfie: historia + visión + qué estás levantando. Compartir el link en la sesión Rockstar." },
    ],
  },
  {
    mision_titulo: "Misión 5: Final Deck",
    clase_nro_teoria: 9,
    clase_nro_rockstar: 10,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Entregar pitch deck completo", descripcion: "Slides mínimas: Problema, Solución, Mercado, Modelo de negocio, Tracción, Equipo, Financieros, Uso de fondos, Ask." },
      { orden: 3, tipo: "Entrega", titulo: "Armar Data Room base", descripcion: "Carpeta con: deck, financieros, cap table, documentos legales básicos, y cualquier material de soporte." },
      { orden: 4, tipo: "Checklist", titulo: "Peer review: dar feedback a otro deck", descripcion: "Revisar el deck de un compañero del programa y enviarle feedback estructurado antes de la sesión." },
    ],
  },
  {
    mision_titulo: "Misión 6: Target List",
    clase_nro_teoria: 11,
    clase_nro_rockstar: 12,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Identificar 50 fondos relevantes", descripcion: "Investigar fondos que invierten en tu tesis, etapa y geografía. Fuentes: Crunchbase, Dealroom, LinkedIn." },
      { orden: 3, tipo: "Entrega", titulo: "Calificar y priorizar top 20", descripcion: "Rankear los 20 más relevantes por fit de tesis, tamaño de ticket, actividad reciente y accesibilidad." },
      { orden: 4, tipo: "Entrega", titulo: "Cargar lista en el CRM", descripcion: "Subir los 50 fondos al CRM con nombre, URL, partner objetivo, y fuente de donde lo sacaste." },
    ],
  },
  {
    mision_titulo: "Misión 7: Templates",
    clase_nro_teoria: 13,
    clase_nro_rockstar: 14,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Redactar 3 templates de cold outreach", descripcion: "Variantes A (directo), B (con gancho de tracción), C (con referencia a portfolio del fondo). Máx 5 líneas cada uno." },
      { orden: 3, tipo: "Entrega", titulo: "Definir secuencia de follow-up", descripcion: "Documentar: cuándo mandas el primer follow-up, qué dices, cuántas veces, cuándo paras." },
      { orden: 4, tipo: "Entrega", titulo: "Enviar un outreach real y documentar", descripcion: "Mandar al menos 1 cold email real esta semana. Registrar: a quién, cuándo, qué template, resultado." },
    ],
  },
  {
    mision_titulo: "Misión 8: Network Map",
    clase_nro_teoria: 15,
    clase_nro_rockstar: 16,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Mapear red de contactos de confianza", descripcion: "Listar advisors, mentores, ex-jefes, inversores ángel conocidos, y alumni que puedan conectar con fondos." },
      { orden: 3, tipo: "Entrega", titulo: "Identificar 5 nodos de alto valor", descripcion: "De tu lista, seleccionar los 5 con mayor probabilidad de hacer intros a fondos de tu target list." },
      { orden: 4, tipo: "Entrega", titulo: "Enviar al menos 3 solicitudes de intro", descripcion: "Contactar a 3 nodos esta semana con un mensaje claro pidiendo una intro específica a un fondo específico." },
    ],
  },
  {
    mision_titulo: "Misión 9: Intro Requests",
    clase_nro_teoria: 17,
    clase_nro_rockstar: 18,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Enviar 10 intro requests formales", descripcion: "Combinar warm intros (via red) y cold outreach directo para llegar a 10 fondos de tu lista." },
      { orden: 3, tipo: "Entrega", titulo: "Registrar respuestas en el CRM", descripcion: "Para cada envío: fecha, canal, respuesta (sí / no / silencio), y siguiente paso." },
      { orden: 4, tipo: "Entrega", titulo: "Documentar objeciones y cómo las manejaste", descripcion: "Anotar las 3 objeciones más comunes que recibiste y cómo respondiste (o cómo responderías)." },
    ],
  },
  {
    mision_titulo: "Misión 10: Momentum Plan",
    clase_nro_teoria: 19,
    clase_nro_rockstar: 20,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Definir 3 hitos de tracción para los próximos 30 días", descripcion: "Hitos medibles que puedas comunicar a inversores: MRR, usuarios, contratos, partnerships, etc." },
      { orden: 3, tipo: "Entrega", titulo: "Crear timeline de cierre", descripcion: "Fechas objetivo para: primer term sheet, due diligence, firma, wire. Trabajar hacia atrás desde una fecha de cierre." },
      { orden: 4, tipo: "Entrega", titulo: "Actualizar pipeline con estado real", descripcion: "Revisar cada inversor en el CRM y actualizar su estado, último contacto, y próximo paso concreto." },
    ],
  },
  {
    mision_titulo: "Misión 11: Term Sheet",
    clase_nro_teoria: 21,
    clase_nro_rockstar: 22,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Identificar y calificar al lead investor potencial", descripcion: "De tu pipeline actual, seleccionar al candidato más fuerte para liderar la ronda y documentar por qué." },
      { orden: 3, tipo: "Entrega", titulo: "Preparar propuesta de valuación", descripcion: "Definir tu valuation pretérmino con justificación: comparables, múltiplos, tracción, mercado." },
      { orden: 4, tipo: "Checklist", titulo: "Revisar y anotar un term sheet modelo", descripcion: "Usar el template de la clase para identificar los 5 términos más importantes y tu posición en cada uno." },
    ],
  },
  {
    mision_titulo: "Misión 12: FOMO Plan",
    clase_nro_teoria: 23,
    clase_nro_rockstar: 24,
    tareas: [
      { orden: 1, tipo: "NPS", titulo: "Feedback de las clases de la semana", descripcion: "Califica las clases de esta semana del 1 al 10 y deja un comentario opcional." },
      { orden: 2, tipo: "Entrega", titulo: "Diseñar estrategia de urgencia y escasez", descripcion: "Definir: cuándo anuncias que la ronda está 'casi cerrada', qué hitos usas, cómo lo comunicas." },
      { orden: 3, tipo: "Entrega", titulo: "Preparar investor update de tracción", descripcion: "Redactar un update de 1 página con los hitos de los últimos 30 días para enviar a todo el pipeline." },
      { orden: 4, tipo: "Entrega", titulo: "Simular conversación de cierre", descripcion: "Hacer roleplay con un compañero del programa: uno es el founder, el otro el inversor escéptico. Grabarlo." },
    ],
  },
];

async function seedTareas(tableId: string) {
  log("\nObteniendo IDs de clases y misiones de Airtable...");

  // Traer todas las clases
  const clasesRecords = await base("Clases MF26").select({ fields: ["titulo"] }).all();
  const misionesRecords = await base("Misiones MF26").select({ fields: ["titulo"] }).all();

  // Mapear por número de sesión (el título empieza con "S{nro} —")
  const claseByNro = new Map<number, string>();
  for (const r of clasesRecords) {
    const titulo = r.fields.titulo as string ?? "";
    const match = titulo.match(/^S(\d+)/);
    if (match) claseByNro.set(parseInt(match[1]), r.id);
  }

  // Mapear misiones por título
  const misionByTitulo = new Map<string, string>();
  for (const r of misionesRecords) {
    const titulo = r.fields.titulo as string ?? "";
    misionByTitulo.set(titulo, r.id);
  }

  log(`  Clases encontradas: ${claseByNro.size}`);
  log(`  Misiones encontradas: ${misionByTitulo.size}`);

  log("\nCreando tareas...");
  let totalCreadas = 0;

  for (const mision of misionesData) {
    const misionId = misionByTitulo.get(mision.mision_titulo);
    if (!misionId) {
      log(`  ⚠ No se encontró misión: ${mision.mision_titulo}`);
      continue;
    }

    const claseTeoriaId = claseByNro.get(mision.clase_nro_teoria);
    const claseRockstarId = claseByNro.get(mision.clase_nro_rockstar);

    for (const tarea of mision.tareas) {
      const fields: Record<string, unknown> = {
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        tipo: tarea.tipo,
        orden: tarea.orden,
        mision: [misionId],
      };

      // La tarea NPS linkea a las 2 clases de esa semana
      if (tarea.tipo === "NPS") {
        const claseIds = [claseTeoriaId, claseRockstarId].filter(Boolean) as string[];
        if (claseIds.length > 0) fields.clases_nps = claseIds;
      }

      await base(tableId as never).create(fields as never);
      totalCreadas++;
    }

    log(`  ✓ ${mision.mision_titulo}: ${mision.tareas.length} tareas creadas`);
  }

  log(`\n✅ ${totalCreadas} tareas creadas en total.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tableId = await crearTabla();
  if (!tableId) throw new Error("No se pudo obtener el ID de la tabla");

  await agregarLinkedFields(tableId);
  await seedTareas(tableId);

  log("\n✅ Todo listo. Revisa Airtable.");
}

main().catch((err) => {
  console.error("[tareas] ERROR:", err);
  process.exit(1);
});
