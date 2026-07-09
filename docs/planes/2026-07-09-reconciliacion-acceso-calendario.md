---
titulo: "Reconciliación acceso ↔ calendario: cerrar el hueco de invitados no inscritos"
fecha: 2026-07-09
proyecto: modoFundraising
estado: pendiente-aprobacion
tipo: fix + guardrail
tags: [calendario, portal_access, churn, cron, reconciliacion, airtable]
---

## Objetivo

Que **solo founders con `portal_access = true` estén en el calendario de sesiones**,
y que quien pierde el acceso salga del calendario automáticamente — sin depender
de que alguien lo haga a mano. Cerrar el caso `monicaoc6@gmail.com` y prevenir
que se repita.

## Caso real diagnosticado (monicaoc6)

- Founder: Monica OConnor · startup **PUESTO SAC** con status `Postulada`.
- Postulación: **`Rechazada por founder`** (declinó, nunca se inscribió, nunca pagó).
- Pero su **`portal_access` quedó en `true`** — nadie lo limpió al rechazarse.
- El 7-jul el botón "Invitar todos los inscritos" / el cron `sync-attendees`
  (que filtran SOLO por `portal_access = 1`) la metió al calendario.
- El cron diario la mantiene invitada a todas las clases futuras.

**Causa raíz:** `portal_access` se pone en `true` en varios flujos pero casi nunca
se limpia cuando alguien sale por rutas distintas al churn de pago (rechazo por
founder, rechazo admin, postulación que no avanza). El calendario confía 100% en
ese flag, así que un flag sucio = invitación fantasma.

## Fuente de verdad (decisión de Gabriel)

`portal_access` del record de **Founder** es el juez único del calendario. Si
`portal_access = true` → debe estar en el calendario. Si `false` → NO debe estar.
El script reconciliador NO cancela Stripe ni toca status; solo alinea el
calendario a `portal_access`, y garantiza que las invitaciones solo miren ese flag.

## Alcance (mínimo y reversible)

El script/cron **solo toca Google Calendar**: agrega a quien tiene acceso y falta,
quita a quien está invitado pero ya no tiene acceso. NO cancela suscripciones, NO
manda emails, NO cambia status en Airtable. Acción reversible.

## Lo que se va a construir

### 1. Fix de datos inmediato (monicaoc6 y similares)
Script `scripts/fix-portal-access-huerfanos.ts` (one-shot, con `--dry-run` default):
- Recorre Founders con `portal_access = true`.
- Marca como huérfano a quien su Postulación esté en un status de NO-acceso
  (`Rechazada`, `Rechazada por founder`, `Churn`, `Churn By Founder`, `Sin Respuesta`)
  o cuya startup esté en `Postulada`/`Churn`/`Rechazada`.
- En modo real: pone `portal_access = false` y lo saca de todos los eventos de
  Calendar con `removeAttendeeFromAllEvents`.
- Imprime tabla de qué corrigió. Corre primero en `--dry-run`, se valida contra
  datos reales, luego se aplica.

### 2. Cron NUEVO de reconciliación cada 4h (decisión: separado)
Nuevo endpoint `POST /api/cron/reconciliar-calendario` (auth `CRON_SECRET`, mismo
patrón que `sync-attendees`). Se deja `sync-attendees` intacto (solo agrega); este
cron nuevo se encarga de LIMPIAR. Separa conceptualmente "invitar" de "sacar".
- Lee la lista de emails con `portal_access = 1` (fuente de verdad) →
  `getAllFoundersWithAccess()`.
- Lee TODOS los attendees actuales de las clases futuras del calendario.
- **Detecta a quien está en el calendario pero SIN `portal_access`** y lo saca con
  `removeAttendeeFromAllEvents`. (No agrega — de eso ya se encarga `sync-attendees`.)
- `dryRun` para reportar sin tocar (sensor MAA: cuántos sobran).
- Devuelve resumen `{ removidos, detalle, attendeesSinAcceso }`.
- Se programa en n8n cada 4h (igual que los otros crons del proyecto).

### 3. Cerrar la fuente del flag sucio (guardrail preventivo)
Para que el reconciliador no esté "limpiando basura" para siempre, desactivar
`portal_access` en los flujos de salida que hoy lo dejan sucio:
- **Rechazo por founder / admin:** el flujo que marca `Rechazada`/`Rechazada por
  founder` debe llamar `deactivateAllFoundersForApplication` (hoy no lo hace).
  Localizar dónde se setea ese status y agregar la desactivación.
- **`equipo/invitar`** (opción elegida: acceso inmediato atado a la startup): el
  invitado ya hereda el status de la startup vía el reconciliador; si la startup
  hace churn, el reconciliador lo saca. No requiere cambio de flujo, pero SÍ
  conviene registrar de qué startup depende para el diff. (Validar que el churn de
  la startup recorra a los cofounders invitados — hoy `deactivateAllFoundersForApplication`
  recorre `founder_record` de la postulación, y `equipo/invitar` sí liga el nuevo
  founder ahí, así que debería cubrirlo. Confirmar en impl.)

### 4. Fix del hueco #2 del cron de cobranza (incluido)
`src/app/api/cron/cobranza/route.ts:76-84` suspende (`portal_access=false`) pero
NO saca del calendario. Agregar `removeAttendeeFromAllEvents` ahí, igual que hace
el webhook. Consistencia en caliente (el reconciliador cada 4h es la red de
seguridad, pero mejor no depender de ella).

### 5. Fix del webhook de Stripe: cancelar sub SIEMPRE limpia (incluido)
Verificado en prod: hoy `customer.subscription.deleted`
([webhook:309](../../src/app/api/stripe/webhook/route.ts)) solo desactiva acceso +
saca del calendario SI `payment_status !== "Cuota 3 pagada" && status !== "Churn By
Founder"`. Consecuencia: **cancelar en Stripe la sub de alguien que ya pagó completo
(o pago único, que también queda marcado "Cuota 3 pagada") NO lo saca del portal ni
del calendario** — se queda con acceso fantasma.

Fix: al recibir `customer.subscription.deleted`, si la baja es real (no es el propio
founder que ya se procesó por el portal), desactivar `portal_access` y sacar del
calendario **sin importar el payment_status**. Se mantiene la guarda contra
`Churn By Founder` (ese caso ya lo limpió el portal, no re-procesar). Es decir:
quitar `payment_status !== "Cuota 3 pagada"` de la condición, dejar solo la guarda
de `Churn By Founder`.

Además, `deactivatePortalForStartup` lee los emails a remover con
`getFounderEmailsByStartup` (filtro `portal_access = 1`). Si un cofounder ya tenía
el flag sucio no se recupera para sacarlo del calendario. El reconciliador (#2) es
la red que atrapa esos casos; documentado como límite conocido.

**Nota:** esto NO cancela suscripciones automáticamente — solo reacciona cuando TÚ
(o Stripe) cancelas una. La cancelación sigue siendo manual/humana.

## Lo que NO se toca

- No se cambia el gate del portal (`layout.tsx`) en esta iteración. El OR
  `portal_access || status∈{Inscrita,Admitida,...}` es un tema aparte; el foco
  ahora es calendario. (Se puede abrir issue separado si Gabriel quiere que el
  portal también use solo `portal_access`.)
- No se cancela ninguna suscripción de Stripe automáticamente.

## Bug adicional descubierto al aplicar (importante)

Al aplicar el fix, `removeAttendeeFromAllEvents` reportó "sacado de 30 eventos" pero
los 3 seguían en el calendario. Causa: usaba `Promise.allSettled` sobre 30 eventos
**en paralelo** (rate-limit de Google Calendar + errores tragados) y, al llamarse
1×por-email, los PATCH concurrentes sobre el mismo evento hacían GET de la lista
vieja y **se pisaban** (el último re-agregaba a quien otro sacó). Además comparaba
emails con `!==` **case-sensitive**.

Fix: nueva `removeAttendeesFromAllEvents(eventIds, emails[])` — **serial**, un solo
PATCH por evento con todos los emails, comparación **case-insensitive**, devuelve
desglose (no traga errores). Mismo patrón que OP-1881 (un solo patch) y OP-1914
(fan-out serial). Se migraron los 4 call-sites (webhook, cancel, cobranza, admin
applications) a la versión plural. Tras el fix: los 3 confirmados FUERA (56
attendee-eventos removidos, 0 errores).

## Hallazgo de datos: DREX inconsistente (dejado para el equipo)

Los 2 de drex.network (Joselyne, Trevor) están en "Money Back" con **reembolso
100% ($837)** → salieron. PERO la startup DREX sigue marcada `Inscrita` en Airtable.
El fix apagó portal_access + los sacó del calendario (correcto), pero NO cambió el
status de la startup (campo single-select con opciones limitadas; forzarlo con
typecast es riesgoso). **Acción manual pendiente para el equipo:** corregir el
status de la startup DREX al valor de salida correcto en Airtable.

## Verificación (contra datos reales — regla del proyecto)

1. `fix-portal-access-huerfanos.ts --dry-run` → revisar la lista de huérfanos
   detectados ANTES de aplicar. Confirmar que monicaoc6 aparece y que no hay
   falsos positivos (ej. becas, invitadas institucionales legítimas).
2. Aplicar el fix. Verificar en Google Calendar que monicaoc6 desapareció de las
   clases futuras.
3. Correr el reconciliador en `dryRun` → confirmar diff vacío o esperado.
4. Verificar que un founder inscrito legítimo sigue en todas sus clases.
5. Programar el cron en n8n cada 4h con el `CRON_SECRET` vigente.

## MAA

- **Medir:** # de attendees del calendario que NO tienen `portal_access` (debe ser
  0 tras el fix). Sensor = el reconciliador en `dryRun` reporta ese número cada
  corrida.
- **Analizar:** si el número vuelve a subir >0 entre corridas, hay un flujo que
  sigue ensuciando `portal_access` sin limpiar calendario → identificarlo.
- **Actuar:** el guardrail (#3) apaga las fuentes conocidas; el cron (#2) es la red
  de seguridad. Revisar en el cierre semanal si el reconciliador corrigió algo
  (idealmente converge a 0 correcciones = flujos limpios en origen).

## Archivos afectados (estimado)

- `scripts/fix-portal-access-huerfanos.ts` (nuevo, one-shot)
- `src/app/api/cron/sync-attendees/route.ts` (extender a diff bidireccional) o
  `src/app/api/cron/reconciliar-calendario/route.ts` (nuevo)
- `src/lib/calendar.ts` (posible helper para leer attendees actuales por evento)
- Flujo de rechazo por founder/admin (localizar y agregar deactivate)
- `src/app/api/cron/cobranza/route.ts` (agregar remove de calendario)
- n8n: nodo de cron cada 4h
