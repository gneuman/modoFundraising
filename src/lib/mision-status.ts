// Predicados de status de misión — fuente única de verdad (OP-2688).
//
// El campo `status` de "🎯 Misiones MF26" es un singleSelect de Airtable, y el
// equipo edita sus opciones sin tocar el código. Cuando agregaron "Termino" y
// quitaron "Cerrada", las tres vistas del portal comparaban strings sueltos:
// las 7 misiones ya terminadas dejaron de matchear en cualquier filtro y
// desaparecieron del portal — no salían como activas ni en el historial.
//
// Regla: ninguna vista compara `mision.status` contra un literal. Todas pasan
// por acá, así que una opción nueva en Airtable se atiende en un solo lugar.

import type { MisionRecord } from "@/lib/airtable";

type MisionStatus = MisionRecord["status"];

/** En curso: el founder puede (y debe) contestarla ahora. */
export function isMisionEnCurso(status: MisionStatus): boolean {
  return status === "Activa" || status === "Actual";
}

/**
 * Terminada: ya pasó su ventana, pero sigue consultable en el historial.
 * "Termino" es el valor vigente en Airtable; "Cerrada" es el histórico.
 */
export function isMisionTerminada(status: MisionStatus): boolean {
  return status === "Termino" || status === "Cerrada";
}

/** Todavía no arranca. No debe mostrarse: leakearía contenido futuro. */
export function isMisionProxima(status: MisionStatus): boolean {
  return status === "Próxima";
}

/**
 * ¿Es contestable? En curso o terminada (entrega tardía). Lo que NO es
 * contestable es lo que aún no arrancó.
 *
 * Ojo con el fallback: un status vacío o desconocido cuenta como contestable a
 * propósito. Si mañana aparece otra opción nueva en Airtable, preferimos que la
 * misión se vea de más y no que se desvanezca en silencio, que es justo el bug
 * que originó este módulo.
 */
export function isMisionContestable(status: MisionStatus): boolean {
  return !isMisionProxima(status);
}
