---
titulo: Flujo de recordatorio para postulaciones abandonadas (1h)
fecha: 2026-05-28
proyecto: modoFundraising
estado: codigo-listo-pendiente-config-airtable-n8n
tipo: feature
tags: [email, cron, airtable, automation, recuperacion]
---

## Objetivo

Enviar un correo automático a los founders que **iniciaron** su postulación a Modo
Fundraising 2026 pero **no la terminaron**, exactamente **1 hora después** de abandonarla,
con un link personalizado para retomar el formulario donde lo dejaron.

## Lo que se hizo (código — compila limpio)

1. **Nuevo cron** `src/app/api/cron/form-reminder/route.ts`
   - `POST` envía el recordatorio; `GET` es preview (no envía).
   - Auth: `Authorization: Bearer <CRON_SECRET>` (mismo patrón que `followup`/`cobranza`).
   - Filtro de abandono: draft sin `status` + `accept_legal_terms != true` + `created_at`
     hace ≥1h (`HOURS_UNTIL_REMINDER = 1`) + `form_reminder_sent_at` vacío.

2. **Helper** `markFormReminderSent()` en `src/lib/airtable.ts` (~línea 888)
   - Marca `form_reminder_sent_at` sin tocar el `status` (es un draft).
   - Campo `form_reminder_sent_at` agregado al tipo `PostulacionRecord`.

3. **`sendFormAbandonado()`** en `src/lib/email-engine.ts` (~línea 230)
   - Ahora acepta `postulacionId?` opcional. Con id → link `/apply/{id}` (recupera
     draft desde Airtable, cross-device). Sin id → raíz `/` (solo localStorage).

4. **Trigger `form_abandonado`** agregado al tipo `TriggerEvent` en `src/lib/airtable.ts`
   (faltaba — el flujo manual previo no compilaba con tipos estrictos).

5. **Panel admin** `src/components/admin/comunicaciones-manager.tsx`
   - Entrada `form_abandonado` en `TRIGGER_META` (grupo "Admisiones").
   - Variable `{{apply_url}}` agregada a `TEMPLATE_VARS`.

6. **Endpoint manual** `recordatorio-form/route.ts` actualizado para pasar `app.id`
   (link personalizado también en el envío manual desde admin).

## Por qué `/apply/{id}` y no la raíz

El formulario (`ChatForm`, usado en `/` y en `/apply/[id]`) recupera el draft de dos formas:
- Raíz `/`: solo vía `localStorage` → falla si el founder abre el correo en otro dispositivo.
- `/apply/{id}`: carga `form_responses` desde Airtable vía `/api/apply/load/[id]` y salta
  a la primera pregunta sin responder. Funciona cross-device. Por eso el cron pasa `app.id`.

## Archivos modificados

- `src/app/api/cron/form-reminder/route.ts` (nuevo)
- `src/lib/airtable.ts` (tipo + helper + trigger)
- `src/lib/email-engine.ts` (sendFormAbandonado con id)
- `src/app/api/admin/applications/recordatorio-form/route.ts` (pasa id)
- `src/components/admin/comunicaciones-manager.tsx` (meta + var)

## Pendiente de configuración (fuera del código)

1. **Airtable — campo**: en `Postulaciones MF26` crear `form_reminder_sent_at`
   (Single line text o Date). Sin esto, reenvía en cada corrida.
2. **Airtable — template + regla**: en `Email Templates MF26` + `Automation Rules MF26`,
   trigger `form_abandonado`, `active = true`, **`delay_hours = 0`** (el delay de 1h lo
   maneja el cron, no Airtable). Copy del subject/body entregado aparte.
3. **n8n**: `POST /api/cron/form-reminder` con Bearer cada 15-30 min.

## Verificación pendiente

- Probar `GET /api/cron/form-reminder` (con Bearer) para ver a quién mandaría sin enviar.
- Confirmar que el template `form_abandonado` quedó activo en Airtable antes de prender n8n.
- Confirmar 1 envío real de punta a punta a un email de prueba.

## MAA (Medir-Analizar-Actuar)

- **Medir**: tasa de recuperación = % de founders que reciben el correo y luego completan.
  El sensor es el campo `form_reminder_sent_at` (permite cruzar "le mandé" vs "completó después").
- **Analizar**: comparar completación de los que recibieron recordatorio vs abandonos
  previos al flujo (base anterior).
- **Actuar**: ajustar el timing (1h) o el copy según lo que mueva la métrica.
