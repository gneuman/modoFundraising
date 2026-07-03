---
titulo: WI-1661 — Checklist contestable en /portal/misiones
fecha: 2026-07-02
proyecto: modoFundraising
estado: mergeado-en-main
tipo: feature
tags: [portal, misiones, checklist, wi-1661]
---

# WI-1661 — Todas las tareas de misión se pueden contestar

## Objetivo

El cliente pidió que **todas las tareas** de una misión activa se puedan contestar y cuenten para "misión completada", sin importar el tipo. Antes solo `Entrega` y `NPS` eran obligatorias; `Checklist` era solo texto informativo.

## Lo que se hizo

- **Backend `src/lib/airtable.ts`** — `recomputeMisionCompletada` ahora incluye `Checklist` en las tareas obligatorias. Para `Entrega` y `Checklist` cuenta la misma regla: hay `Consigna` para `(startup, tarea)` → hecha.
- **Backend `src/app/api/portal/consignas/route.ts`** — POST acepta `tarea.tipo === "Entrega" || tarea.tipo === "Checklist"`. Se quitó el bloqueo que solo permitía Entrega.
- **UI `src/app/portal/misiones/page.tsx`** — el switch de tipo eliminó la rama `TareaChecklistItem` (informativo); ahora Entrega y Checklist usan el mismo `EntregaForm` con `initialConsigna`.
- **UI `src/components/clases/clase-card.tsx`** — `tareasObligatorias` incluye Checklist; `isTareaHecha` trata Checklist igual que Entrega. El mini-progress `x/N` de la misión activa refleja Checklists.
- **UI `src/app/portal/clases/page.tsx`** — comentario actualizado (`tareasRespondidasSet` ya funcionaba, no filtra por tipo).

## Archivos modificados

- `src/lib/airtable.ts`
- `src/app/api/portal/consignas/route.ts`
- `src/app/portal/misiones/page.tsx`
- `src/components/clases/clase-card.tsx`
- `src/app/portal/clases/page.tsx`

## Cero cambios en schema

Se reusa la tabla `Consignas MF26` con la misma clave `id_consigna = startupId-tareaId`. Airtable no cambia.

## Retro-compatibilidad — decisión: solo hoy en adelante

Gabriel eligió NO retro-completar las misiones viejas. Ver [memoria: wi-1661-checklist-solo-hoy-en-adelante].

**Riesgo aceptado:** si un founder de una misión vieja edita su Entrega en `/portal/misiones`, el POST llama a `recomputeMisionCompletada`, y como no hay `Consigna` de Checklist, `Misiones Completadas.completada` baja de `true` a `false`. La misión "se des-completa sola".

**Plan de contención:** manejar caso por caso. Si pasa >5 veces en 2 semanas, correr script grandfather.

## MAA

- **Medir:**
  - Cuántas filas de `Misiones Completadas MF26` bajan de `true` a `false` en las próximas 2 semanas.
  - % de tareas Checklist con Consigna vs. total de Checklists visibles.
  - Tasa de completitud de misiones nuevas (con Checklist obligatoria) vs. viejas.
- **Analizar:**
  - Si des-completaciones > 5 → grandfather script necesario.
  - Si % Checklist contestada < 30% → los founders no están viendo/usando el form nuevo, revisar copy o UX.
  - Si tasa de completitud cae > 30 puntos → Checklist estaba de más como obligatoria, agregar flag `obligatoria` a Tarea.
- **Actuar:**
  - Grandfather script `scripts/backfill-checklist-consignas.ts`: crear Consigna auto con `contenido_texto = "auto-grandfathered"` para toda Checklist de `(startup, mision)` donde `Misiones Completadas.completada = true` en snapshot 2026-07-02.
  - O cambio de política: `recomputeMisionCompletada` solo sube `false → true`, nunca baja `true → false` (2 líneas de guardia).

## Verificación pendiente

- [ ] Validar en prod (post-Vercel deploy) que la misión activa muestra input en todas las tareas Checklist.
- [ ] Enviar una respuesta a Checklist y confirmar que aparece en verde "Enviada".
- [ ] Confirmar que al completar Entrega + NPS + Checklist de la misión activa, el badge pasa a "Completada".
- [ ] En `/portal/clases`, mini-progress `x/N` cuenta Checklist en N.
- [ ] Mover WI-1661 a `Done` en Linear (manual, solo cuando cliente confirme).

## Trazabilidad

- Linear: [WI-1661](https://linear.app/gnb-labs/issue/WI-1661)
- PR: [#24](https://github.com/gneuman/modoFundraising/pull/24) — squash-merged 2026-07-02
- Commit main: `18fad43`
