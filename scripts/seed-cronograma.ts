/**
 * Seed: Cronograma MF26
 * Crea todas las clases y misiones del programa en Airtable.
 * Ejecutar: npx tsx scripts/seed-cronograma.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!
);

const CLASES = "Clases MF26";
const MISIONES = "Misiones MF26";

// ─── Datos del cronograma ─────────────────────────────────────────────────────

const clases = [
  // FASE 1: Get Ready & Sexy
  {
    nro: 1,
    titulo: "Program Launch",
    descripcion: 'Bienvenida oficial, roadmap 2026 y alineación de la "Disciplina de Levantamiento" necesaria para el programa.',
    fecha: "2026-06-30",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 1,
    fase: "Fase 1",
    expositor: "David Alvo",
  },
  {
    nro: 2,
    titulo: "Rockstar Launch",
    descripcion: "Sesión práctica de arranque: presentaciones del grupo y primeros pasos en el programa.",
    fecha: "2026-07-02",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 1,
    fase: "Fase 1",
    mision_nro: 1,
  },
  {
    nro: 3,
    titulo: "Fundraising Techstack",
    descripcion: "Configuración de CRM de inversores, herramientas de tracking y automatización para no perder leads en el proceso.",
    fecha: "2026-07-07",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 2,
    fase: "Fase 1",
    expositor: "David Alvo",
  },
  {
    nro: 4,
    titulo: "Rockstar Techstack",
    descripcion: "Sesión práctica: configuración de herramientas y CRM en vivo.",
    fecha: "2026-07-09",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 2,
    fase: "Fase 1",
    mision_nro: 2,
  },
  {
    nro: 5,
    titulo: "Fundraising Strategy",
    descripcion: "Diseño de la ronda, tesis de inversión, unit economics y definición técnica del uso de fondos.",
    fecha: "2026-07-14",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 3,
    fase: "Fase 1",
    expositor: "David Alvo",
  },
  {
    nro: 6,
    titulo: "Rockstar Strategy",
    descripcion: "Sesión práctica: revisión de estrategia de ronda de cada startup.",
    fecha: "2026-07-16",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 3,
    fase: "Fase 1",
    mision_nro: 3,
  },
  {
    nro: 7,
    titulo: "Founder Storytelling",
    descripcion: "Construcción de la narrativa del fundador y la visión de la compañía para generar conexión emocional con el VC.",
    fecha: "2026-07-21",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 4,
    fase: "Fase 1",
    expositor: "Yoel Chlimper",
  },
  {
    nro: 8,
    titulo: "Rockstar Storytelling",
    descripcion: "Sesión práctica: trabajo en narrativa y pitch del fundador.",
    fecha: "2026-07-23",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 4,
    fase: "Fase 1",
    mision_nro: 4,
  },
  {
    nro: 9,
    titulo: "Mastering Pitch Decks",
    descripcion: "Estructuración del mazo de inversión (slides clave: Problema, Solución, Mercado, Tracción) y preparación del Data Room.",
    fecha: "2026-07-28",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 5,
    fase: "Fase 1",
    expositor: "David Alvo",
  },
  {
    nro: 10,
    titulo: "Rockstar Pitch Decks",
    descripcion: "Sesión práctica: revisión de pitch decks y data rooms.",
    fecha: "2026-07-30",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 5,
    fase: "Fase 1",
    mision_nro: 5,
  },
  // FASE 2: Research and Approach
  {
    nro: 11,
    titulo: "Investor Research",
    descripcion: 'Identificación y calificación de fondos por tesis, etapa y geografía para construir una "Target List" eficiente.',
    fecha: "2026-08-04",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 6,
    fase: "Fase 2",
    expositor: "David Alvo",
  },
  {
    nro: 12,
    titulo: "Rockstar Research",
    descripcion: "Sesión práctica: construcción de target lists de inversores.",
    fecha: "2026-08-06",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 6,
    fase: "Fase 2",
    mision_nro: 6,
  },
  {
    nro: 13,
    titulo: "Investor Approach",
    descripcion: "El arte del Cold Outreach, redacción de correos de alto impacto y gestión estratégica del seguimiento (Follow-up).",
    fecha: "2026-08-11",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 7,
    fase: "Fase 2",
    expositor: "Nathan B.",
  },
  {
    nro: 14,
    titulo: "Rockstar Approach",
    descripcion: "Sesión práctica: redacción de templates de outreach.",
    fecha: "2026-08-13",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 8,
    fase: "Fase 2",
    mision_nro: 7,
  },
  {
    nro: 15,
    titulo: "Networks",
    descripcion: "Mapeo y activación de nodos de confianza (Advisors, mentores) para llegar a inversores mediante Warm Intros.",
    fecha: "2026-08-18",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 8,
    fase: "Fase 2",
    expositor: "David Alvo",
  },
  {
    nro: 16,
    titulo: "Rockstar Networks",
    descripcion: "Sesión práctica: mapeo de red y solicitudes de intro.",
    fecha: "2026-08-20",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 9,
    fase: "Fase 2",
    mision_nro: 8,
  },
  {
    nro: 17,
    titulo: "Connections",
    descripcion: "Gestión de las primeras reuniones (Intro Calls), validación de interés y manejo de objeciones iniciales.",
    fecha: "2026-08-25",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 9,
    fase: "Fase 2",
    expositor: "David Alvo",
  },
  {
    nro: 18,
    titulo: "Rockstar Connections",
    descripcion: "Sesión práctica: roleplay de intro calls y manejo de objeciones.",
    fecha: "2026-08-27",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 10,
    fase: "Fase 2",
    mision_nro: 9,
  },
  // FASE 3: Momentum & FOMO
  {
    nro: 19,
    titulo: "Managing Momentum",
    descripcion: 'Creación de hitos de tracción y gestión de tiempos para mover a los inversores del "quizás" al "sí".',
    fecha: "2026-09-01",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 10,
    fase: "Fase 3",
    expositor: "David Alvo",
  },
  {
    nro: 20,
    titulo: "Rockstar Momentum",
    descripcion: "Sesión práctica: construcción del plan de momentum.",
    fecha: "2026-09-03",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 11,
    fase: "Fase 3",
    mision_nro: 10,
  },
  {
    nro: 21,
    titulo: "Lead Investor",
    descripcion: "Cómo conseguir al inversor principal, negociación de valuación y revisión técnica de Term Sheets.",
    fecha: "2026-09-08",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 11,
    fase: "Fase 3",
    expositor: "David Alvo",
  },
  {
    nro: 22,
    titulo: "Rockstar Lead",
    descripcion: "Sesión práctica: análisis de term sheets y negociación de valuación.",
    fecha: "2026-09-10",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 12,
    fase: "Fase 3",
    mision_nro: 11,
  },
  {
    nro: 23,
    titulo: "FOMO",
    descripcion: "Psicología del inversor aplicada para generar urgencia, escasez y competencia sana entre fondos.",
    fecha: "2026-09-22",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 12,
    fase: "Fase 3",
    expositor: "David Alvo",
  },
  {
    nro: 24,
    titulo: "Rockstar FOMO",
    descripcion: "Sesión práctica: diseño de estrategia FOMO y cierre de ronda.",
    fecha: "2026-09-24",
    horario: "12:00 - 13:30",
    tipo: "Rockstar",
    semana: 13,
    fase: "Fase 3",
    mision_nro: 12,
  },
  {
    nro: 25,
    titulo: "Closing Round",
    descripcion: "Proceso de cierre legal, firmas de documentos, Due Diligence final y relación post-closing con el board.",
    fecha: "2026-09-29",
    horario: "12:00 - 13:30",
    tipo: "Teoría",
    semana: 13,
    fase: "Fase 3",
    expositor: "David Alvo",
  },
  {
    nro: 26,
    titulo: "Graduation",
    descripcion: "Presentación final ante VCs invitados y ceremonia de cierre del programa.",
    fecha: "2026-10-01",
    horario: "12:00 - 13:30",
    tipo: "Graduation",
    semana: 14,
    fase: "Graduación",
  },
];

// Misiones con tareas embebidas en instrucciones
// La Tarea 1 siempre es "Feedback de las clases de la semana anterior"
// fecha_limite = fecha de la clase Rockstar correspondiente (mismo día, antes de la sesión)
const misiones = [
  {
    nro: 1,
    titulo: "Misión 1: Onboarding",
    descripcion: "Primer contacto oficial con el programa: perfil completo, comunidad y 1:1 de bienvenida.",
    fecha_limite: "2026-07-02",
    semana: 1,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 1 (Program Launch).

**Tarea 2 — Completar perfil en el portal**
Subir foto, bio, LinkedIn y rol dentro de la startup.

**Tarea 3 — Presentarse en la comunidad**
Publicar tu presentación en el grupo de WhatsApp/Slack del programa.

**Tarea 4 — Agendar 1:1 de bienvenida**
Coordinar y realizar el 1:1 de onboarding con el equipo de Modo Fundraising.`,
    clase_nro: 2,
  },
  {
    nro: 2,
    titulo: "Misión 2: Techstack",
    descripcion: "Configurar el stack de herramientas para gestionar el proceso de fundraising.",
    fecha_limite: "2026-07-09",
    semana: 2,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 2 (Fundraising Techstack).

**Tarea 2 — Configurar CRM de inversores**
Elegir y configurar tu CRM (Notion, Airtable, HubSpot u otro) con las etapas del pipeline definidas en clase.

**Tarea 3 — Crear pipeline de seguimiento**
Definir y documentar las etapas: Identificado → Contactado → Respondió → Reunión → En proceso → Cerrado.

**Tarea 4 — Documentar elecciones de techstack**
Registrar qué herramientas elegiste y por qué. Compartir en la sesión Rockstar.`,
    clase_nro: 4,
  },
  {
    nro: 3,
    titulo: "Misión 3: Strategy",
    descripcion: "Definir la estrategia de ronda con tesis, unit economics y uso de fondos.",
    fecha_limite: "2026-07-16",
    semana: 3,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 3 (Fundraising Strategy).

**Tarea 2 — Definir tesis de inversión**
Redactar en 1 párrafo la tesis de tu ronda: por qué ahora, para qué, y quién es tu inversor ideal.

**Tarea 3 — Calcular unit economics clave**
Documentar CAC, LTV, MRR, runway y cualquier métrica relevante para tu modelo.

**Tarea 4 — Documentar uso de fondos**
Breakdown detallado de en qué se gastará el capital recaudado (% por área o iniciativa).`,
    clase_nro: 6,
  },
  {
    nro: 4,
    titulo: "Misión 4: Storytelling",
    descripcion: "Construir la narrativa del fundador y el pitch emocional de la compañía.",
    fecha_limite: "2026-07-23",
    semana: 4,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 4 (Founder Storytelling).

**Tarea 2 — Escribir la historia del fundador**
Redactar en 200 palabras: por qué fundaste esto, qué problema viviste en carne propia, qué te hace la persona correcta.

**Tarea 3 — Definir la visión en una frase**
Una frase que capture el futuro que tu startup está construyendo. Debe resonar con un inversor en 10 segundos.

**Tarea 4 — Grabar elevator pitch de 60 segundos**
Video selfie: historia + visión + qué estás levantando. Compartir el link en la sesión Rockstar.`,
    clase_nro: 8,
  },
  {
    nro: 5,
    titulo: "Misión 5: Final Deck",
    descripcion: "Entregar el pitch deck completo y el Data Room base.",
    fecha_limite: "2026-07-30",
    semana: 5,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 5 (Mastering Pitch Decks).

**Tarea 2 — Entregar pitch deck completo**
Slides mínimas: Problema, Solución, Mercado, Modelo de negocio, Tracción, Equipo, Financieros, Uso de fondos, Ask.

**Tarea 3 — Armar Data Room base**
Carpeta con: deck, financieros, cap table, documentos legales básicos, y cualquier material de soporte.

**Tarea 4 — Peer review: dar feedback a otro deck**
Revisar el deck de un compañero del programa y enviarle feedback estructurado antes de la sesión.`,
    clase_nro: 10,
  },
  {
    nro: 6,
    titulo: "Misión 6: Target List",
    descripcion: "Construir y calificar la lista de fondos target para el proceso.",
    fecha_limite: "2026-08-06",
    semana: 6,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 6 (Investor Research).

**Tarea 2 — Identificar 50 fondos relevantes**
Investigar fondos que invierten en tu tesis, etapa y geografía. Fuentes: Crunchbase, Dealroom, LinkedIn.

**Tarea 3 — Calificar y priorizar top 20**
Rankear los 20 más relevantes por fit de tesis, tamaño de ticket, actividad reciente y accesibilidad.

**Tarea 4 — Cargar lista en el CRM**
Subir los 50 fondos al CRM con nombre, URL, partner objetivo, y fuente de donde lo sacaste.`,
    clase_nro: 12,
  },
  {
    nro: 7,
    titulo: "Misión 7: Templates",
    descripcion: "Crear templates de cold outreach y definir la secuencia de follow-up.",
    fecha_limite: "2026-08-13",
    semana: 7,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 7 (Investor Approach).

**Tarea 2 — Redactar 3 templates de cold outreach**
Variantes A (directo), B (con gancho de tracción), C (con referencia a portfolio del fondo). Máx 5 líneas cada uno.

**Tarea 3 — Definir secuencia de follow-up**
Documentar: cuándo mandas el primer follow-up, qué dices, cuántas veces, cuándo paras.

**Tarea 4 — Enviar un outreach real y documentar**
Mandar al menos 1 cold email real esta semana. Registrar: a quién, cuándo, qué template, resultado.`,
    clase_nro: 14,
  },
  {
    nro: 8,
    titulo: "Misión 8: Network Map",
    descripcion: "Mapear la red de confianza y activar nodos para warm intros.",
    fecha_limite: "2026-08-20",
    semana: 8,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 8 (Networks).

**Tarea 2 — Mapear red de contactos de confianza**
Listar advisors, mentores, ex-jefes, inversores ángel conocidos, y alumni que puedan conectar con fondos.

**Tarea 3 — Identificar 5 nodos de alto valor**
De tu lista, seleccionar los 5 con mayor probabilidad de hacer intros a fondos de tu target list.

**Tarea 4 — Enviar al menos 3 solicitudes de intro**
Contactar a 3 nodos esta semana con un mensaje claro pidiendo una intro específica a un fondo específico.`,
    clase_nro: 16,
  },
  {
    nro: 9,
    titulo: "Misión 9: Intro Requests",
    descripcion: "Activar el pipeline con intro requests formales y gestionar las primeras respuestas.",
    fecha_limite: "2026-08-27",
    semana: 9,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 9 (Connections).

**Tarea 2 — Enviar 10 intro requests formales**
Combinar warm intros (via red) y cold outreach directo para llegar a 10 fondos de tu lista.

**Tarea 3 — Registrar respuestas en el CRM**
Para cada envío: fecha, canal, respuesta (sí / no / silencio), y siguiente paso.

**Tarea 4 — Documentar objeciones y cómo las manejaste**
Anotar las 3 objeciones más comunes que recibiste y cómo respondiste (o cómo responderías).`,
    clase_nro: 18,
  },
  {
    nro: 10,
    titulo: "Misión 10: Momentum Plan",
    descripcion: "Crear el plan de momentum para mover inversores de 'quizás' a 'sí'.",
    fecha_limite: "2026-09-03",
    semana: 10,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 10 (Managing Momentum).

**Tarea 2 — Definir 3 hitos de tracción para los próximos 30 días**
Hitos medibles que puedas comunicar a inversores: MRR, usuarios, contratos, partnerships, etc.

**Tarea 3 — Crear timeline de cierre**
Fechas objetivo para: primer term sheet, due diligence, firma, wire. Trabajar hacia atrás desde una fecha de cierre.

**Tarea 4 — Actualizar pipeline con estado real**
Revisar cada inversor en el CRM y actualizar su estado, último contacto, y próximo paso concreto.`,
    clase_nro: 20,
  },
  {
    nro: 11,
    titulo: "Misión 11: Term Sheet",
    descripcion: "Identificar el lead investor y preparar la negociación de valuación y term sheet.",
    fecha_limite: "2026-09-10",
    semana: 11,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 11 (Lead Investor).

**Tarea 2 — Identificar y calificar al lead investor potencial**
De tu pipeline actual, seleccionar al candidato más fuerte para liderar la ronda y documentar por qué.

**Tarea 3 — Preparar propuesta de valuación**
Definir tu valuation pretérmino con justificación: comparables, múltiplos, tracción, mercado.

**Tarea 4 — Revisar y anotar un term sheet modelo**
Usar el template de la clase para identificar los 5 términos más importantes y tu posición en cada uno.`,
    clase_nro: 22,
  },
  {
    nro: 12,
    titulo: "Misión 12: FOMO Plan",
    descripcion: "Diseñar la estrategia de cierre con urgencia, escasez y competencia entre fondos.",
    fecha_limite: "2026-09-24",
    semana: 12,
    instrucciones: `**Tarea 1 — Feedback de las clases de la semana anterior**
Completar el formulario de feedback para las clases de la semana 12 (FOMO).

**Tarea 2 — Diseñar estrategia de urgencia y escasez**
Definir: cuándo anuncias que la ronda está "casi cerrada", qué hitos usas, cómo lo comunicas.

**Tarea 3 — Preparar investor update de tracción**
Redactar un update de 1 página con los hitos de los últimos 30 días para enviar a todo el pipeline.

**Tarea 4 — Simular conversación de cierre**
Hacer roleplay con un compañero del programa: uno es el founder, el otro el inversor escéptico. Grabarlo.`,
    clase_nro: 24,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("Iniciando seed del cronograma MF26...\n");

  // 1. Crear todas las clases
  log(`Creando ${clases.length} clases...`);
  const claseIdByNro = new Map<number, string>();

  for (const clase of clases) {
    const fields: Record<string, unknown> = {
      titulo: `S${clase.nro} — ${clase.tipo}: ${clase.titulo}`,
      descripcion: clase.descripcion,
      semana: clase.semana,
      fecha: clase.fecha,
      status: "Próxima",
    };

    const record = await base(CLASES).create(fields as never);
    claseIdByNro.set(clase.nro, record.id);
    log(`  ✓ Clase ${clase.nro}: ${clase.titulo} (${clase.fecha})`);
  }

  // 2. Crear las 12 misiones, linkeadas a su clase Rockstar
  log(`\nCreando ${misiones.length} misiones...`);

  for (const mision of misiones) {
    const claseId = claseIdByNro.get(mision.clase_nro);
    const fields: Record<string, unknown> = {
      titulo: mision.titulo,
      descripcion: mision.descripcion,
      instrucciones: mision.instrucciones,
      semana: mision.semana,
      fecha_limite: mision.fecha_limite,
      status: "Próxima",
    };
    if (claseId) fields.clase = [claseId];

    await base(MISIONES).create(fields as never);
    log(`  ✓ Misión ${mision.nro}: ${mision.titulo} → vence ${mision.fecha_limite}`);
  }

  log("\n✅ Seed completado. Revisa Airtable.");
}

main().catch((err) => {
  console.error("[seed] ERROR:", err);
  process.exit(1);
});
