---
titulo: Webhook Upsert Calendar (WI-1622)
fecha: 2026-06-30
proyecto: Modo Fundraising 2026 — Web
estado: implementado, pendiente setup en Airtable
tipo: feature
tags: [airtable, google-calendar, webhook, clases]
linear: https://linear.app/gnb-labs/issue/WI-1622
---

## Objetivo

Cuando alguien marca una clase como **`listo_publicar`** en Airtable, el sistema debe:

1. Crear el evento de Google Calendar (Founders + Equipo) si no existe.
2. Actualizar campos si cambiaron (con diff para no spamear "evento actualizado").
3. Invitar a todos los Founders activos al evento Founders (los nuevos que no estén).

Sin debounce en fase 1 — el gate manual (`listo_publicar`) + diff evita el ruido.

## Lo que se hizo

### Tipos (`src/lib/airtable.ts`)
- `ClaseRecord` y `ClaseInput` ganaron `listo_publicar?: boolean` y `duracion_minutos?: number`.
- Función nueva `getClaseByIdFresh(id)`: lee directo de Airtable sin pasar por el cache de `unstable_cache`. Necesaria para que el webhook tome decisiones (gate/diff) sobre datos actuales.

### Helper Calendar (`src/lib/calendar.ts`)
- Función nueva `upsertCalendarEvent({ eventId?, titulo, descripcion, fecha, duracionMinutos?, attendeeEmails? })`.
- Lógica:
  - **CREATE**: si no hay `eventId`, llama a `createCalendarEvent` (que ya genera Meet) y luego agrega cada attendee individualmente vía `addAttendeeToEvent`. **Attendees solo se invitan en este momento — nunca en update**.
  - **UPDATE**: `events.get` primero, luego compara `summary`, `description`, `start.dateTime`, `end.dateTime` contra el payload entrante. Solo llama a `events.patch` si algo cambió.
  - **`sendUpdates`**: `'all'` si cambia `titulo` o `fecha` (material). `'none'` si solo cambió la descripción (typo no debe notificar).
  - **Attendees**: el mantenimiento de la lista de invitados (inscripción / churn) vive aparte, NO en el upsert. Por eso `attendeeEmails` solo se usa en CREATE.
- Retorna `{ eventId, meetLink, htmlLink, action: 'created'|'updated'|'noop', changedFields, attendeesAdded }`.

### Endpoint webhook (`src/app/api/airtable/clase-upsert/route.ts`)
- `POST /api/airtable/clase-upsert`.
- Body: `{ secret, recordId }`.
- **Gate**: si `listo_publicar = false`, responde `{ skipped }` sin tocar Calendar.
- Resuelve Founders activos con `getAllFoundersWithAccess()` (filtro `portal_access = 1`) **solo si el evento Founders no existe todavía** (CREATE path).
- Hace upsert dual:
  - `calendar_event_id` (Founders) con título "X" + attendees Founder en CREATE.
  - `calendar_event_id_team` (Equipo) con título "[Equipo] X" SIN attendees Founder.
- Persiste `calendar_event_id` / `meet_link` (y los `_team`) en Airtable cuando se crean por primera vez.
- **Auto-off**: tras un upsert exitoso (ambos eventos OK), pone `listo_publicar = false` en Airtable. El checkbox actúa como "botón de publicar". Para republicar tras edición, volver a marcar (con el diff es seguro).
- Revalida tag `clases-content` para que el portal vea el cambio sin esperar TTL.
- Seguridad: shared secret en `AIRTABLE_WEBHOOK_SECRET`.

### Endpoint admin portal (`src/app/api/admin/clases/route.ts`)
- Refactorizado para usar el mismo `upsertCalendarEvent` que el webhook.
- `POST` (crear clase desde `/admin/clases`): crea evento Founders + Equipo con attendees Founder en el evento Founders. Mismo comportamiento que el webhook en CREATE.
- `PATCH` (editar clase desde `/admin/clases`): si cambian `titulo` / `fecha` / `descripcion` / `duracion_minutos`, releé fresh la clase y llama `upsertCalendarEvent` que aplica diff. **No invita Founders en update**.
- Las dos puertas (UI admin y checkbox de Airtable) ahora tienen el mismo comportamiento de Calendar.

## Verificación (MAA)

### Medir
- # llamadas a Calendar API por semana (debería bajar vs. webhook sin gate).
- # notificaciones "evento actualizado" recibidas por un Founder de muestra.
- Drift Airtable↔Calendar (objetivo: 0 en clases con `listo_publicar = true`).

### Analizar
- Comparar contra baseline (scripts manuales `invitar-todos-*.ts`).

### Actuar
- Si los Founders siguen reportando ruido tras unas semanas → mover a fase 2 (debounce con cola).

## Archivos modificados

- `src/lib/airtable.ts` — tipos + `getClaseByIdFresh`.
- `src/lib/calendar.ts` — `upsertCalendarEvent` + tipos `UpsertCalendarInput` / `UpsertCalendarResult`. Attendees solo en CREATE.
- `src/app/api/airtable/clase-upsert/route.ts` — endpoint webhook nuevo con gate + diff + auto-off.
- `src/app/api/admin/clases/route.ts` — refactor de POST + PATCH para usar `upsertCalendarEvent` (unifica con el webhook).
- `scripts/setup-clase-upsert-fields.ts` — crea `listo_publicar` (checkbox) y `duracion_minutos` (number) en Clases MF26 via Meta API.
- `docs/setup-airtable-webhook-clases.md` — sección nueva para el setup del Automation `listo_publicar`.

## Verificación pendiente

- [x] Campos creados en Airtable: `listo_publicar` (checkbox `fldBr1EXKCnpOGqjb`) y `duracion_minutos` (number `fldN4Tefiw9oKuZnS`).
- [ ] `AIRTABLE_WEBHOOK_SECRET` en Vercel (Production + Preview + Development) → re-deploy.
- [ ] Crear Automation en Airtable: trigger "When record matches conditions" con `listo_publicar = checked` → action "Run script" apuntando a `POST /api/airtable/clase-upsert`.
- [ ] Smoke test webhook:
  - [ ] Clase nueva sin `calendar_event_id`, marcar `listo_publicar` → debe crear evento + invitar Founders + auto-desmarcar el checkbox.
  - [ ] Editar `descripcion`, volver a marcar → `changedFields: ['descripcion']`, ningún Founder recibe email, checkbox queda desmarcado.
  - [ ] Cambiar `fecha`, marcar → `changedFields: ['fecha']`, Founders reciben email "actualizado".
  - [ ] Marcar sin cambios → `action: 'noop'` y checkbox queda desmarcado.
- [ ] Smoke test botón Guardar admin:
  - [ ] Crear clase desde `/admin/clases` con fecha → evento Founders + Equipo creados, Founders invitados.
  - [ ] Editar descripción desde `/admin/clases` → patch silencioso (sendUpdates none).
  - [ ] Editar fecha desde `/admin/clases` → patch con sendUpdates all.

## Fuera de alcance (fase 2)

- Debounce con cola (~2-5 min). Solo si fase 1 muestra ruido residual.
- UI para forzar resync sin pasar por Airtable.
