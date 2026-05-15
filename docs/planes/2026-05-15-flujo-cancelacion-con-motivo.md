---
titulo: Flujo de cancelación de suscripción con captura de motivo
fecha: 2026-05-15
proyecto: modoFundraising
estado: completado
tipo: feature
tags: [portal, suscripcion, churn, airtable, stripe]
---

## Objetivo original

Cuando un founder ya inscrito cancela su suscripción al programa, el flujo
debe preguntar el motivo (lista cerrada de 5 opciones + "Otro" con campo
abierto) y registrar el rechazo en una tabla nueva ligada a la Startup.

Opciones presentadas:

- 💸 El precio no se ajusta a mi presupuesto actual
- ⏰ No tengo el tiempo que requiere el programa
- 🎯 Mis prioridades cambiaron y el fundraising no es el foco ahora
- ✅ Ya levanté mi ronda
- 🤔 El programa no era lo que esperaba
- Otro (campo abierto)

## Lo que se hizo

1. **Nueva tabla `Rechazos MF26`** registrada en `Tables` de `src/lib/airtable.ts`.
   Campos esperados en Airtable:
   - `reason_code` (texto): código corto del motivo (`precio`, `tiempo`,
     `prioridades`, `ronda_levantada`, `no_esperado`, `otro`).
   - `reason_label` (texto): etiqueta visible que se mostró al founder.
   - `detail` (texto largo): contenido del campo abierto cuando aplica.
   - `email` (texto): correo del founder.
   - `created_at` (fecha): timestamp ISO.
   - `Startup` (link → Startups MF26): registro de la startup.
   - `Postulacion` (link → Postulaciones MF26): registro de la postulación.
   - `Founder` (link → Founders MF26): registro del founder principal.

2. **Tipos y helpers nuevos** en `src/lib/airtable.ts`:
   - `ChurnReasonCode` (unión de los 6 códigos).
   - `CHURN_REASON_LABELS` (mapa código → etiqueta canónica con emoji).
   - `RechazoInput` (forma del payload).
   - `createRechazoRecord()` que crea el registro en la tabla nueva.

3. **Endpoint `/api/stripe/cancel`** actualizado para:
   - Recibir `reasonCode` y `detail` en el JSON del request.
   - Validar que `reasonCode` sea uno de los 6 permitidos.
   - Exigir `detail` cuando `reasonCode === "otro"`.
   - Crear el registro en `Rechazos MF26` en paralelo con los updates
     existentes (Postulación → Churn By Founder, Founders → desactivar,
     Startup → Churn).

4. **UI `suscripcion-client.tsx`** ahora:
   - Al hacer clic en "Cancelar suscripción" muestra primero la lista de
     motivos como radio buttons.
   - Cuando se elige "Otro" aparece un `textarea` obligatorio.
   - Botón "Sí, cancelar" deshabilitado hasta que haya `reasonCode`.
   - El POST envía `{ reasonCode, detail }` y, al cerrar el diálogo,
     resetea el estado.

## Archivos creados/modificados

- `src/lib/airtable.ts` — tabla `RECHAZOS`, tipos y helper.
- `src/app/api/stripe/cancel/route.ts` — validación + creación del registro.
- `src/app/portal/suscripcion/suscripcion-client.tsx` — UI con captura de motivo.
- `docs/planes/2026-05-15-flujo-cancelacion-con-motivo.md` — este documento.

## Verificación pendiente

- Crear la tabla `Rechazos MF26` en Airtable con los campos descritos
  arriba y los links a `Postulaciones MF26`, `Startups MF26` y
  `Founders MF26`. Sin esta tabla, el `create` en `createRechazoRecord`
  fallará en runtime aunque el resto del flujo (cancel Stripe, status
  updates) ya quedó hecho antes de la creación del registro de rechazo.
- Probar end-to-end con un founder activo: confirmar que se ven los
  6 motivos, que el `textarea` aparece sólo en "Otro" y que el registro
  aparece en Airtable ligado a la Startup correcta.
- Validar que la columna existente `churn_reason` en `Postulaciones MF26`
  ya no es necesaria (se mantuvo `saveChurnReason` por compatibilidad pero
  no se llama desde el flujo nuevo).
