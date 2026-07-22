---
titulo: "Baja siempre disponible + fix de total de cuotas (caso Maity)"
fecha: 2026-07-22
proyecto: modoFundraising
estado: en-review
tipo: bugfix
tags: [suscripcion, churn, stripe, airtable, portal, OP-2245]
---

## Objetivo

Que un founder pueda **darse de baja siempre** desde la sección de Suscripción,
aun cuando ya pagó todo, y corregir el caso Maity que mostraba "3 cuotas" cuando
su plan era de **4** y por eso no le aparecía el botón de baja.

## Contexto / reporte

Gabriel (2026-07-22): "Necesito poder tener un flujo de cancelar siempre, aun
cuando ya pagaron todo. Maity se quiere dar de baja y no le aparece la opción."

Errores reportados:
1. Su pago era en 4 cuotas y le aparecía "3 cuotas · ya pagadas".
2. No aparecía la opción de baja en Suscripción.

Decisión de Gabriel sobre alcance: **baja siempre**, pero el botón vive **solo
en la sección de Suscripción (pagos)** — NO en portal/clases/misiones.

## Causa raíz

El portal de Suscripción asumía **3 cuotas** e ignoraba el campo `total_cuotas`
de Airtable:
- `getSubscriptionSummary` leía `total_cuotas` de la **metadata de Stripe**, que
  en Maity viene vacía (`metadata: {}`) → `totalCuotas: null` → UI caía al texto
  por defecto "US$349 / mes · 3 cuotas".
- `suscripcion-client.tsx`: `cuotasCompletas` se activaba con
  `payment_status === "Cuota 3 pagada"`, forzando `puedeCancel = false`. Pero a
  Maity le faltaba la cuota 4 → no estaba completa, y aun estándolo Gabriel
  quiere permitir la baja.

## Datos reales (script check-maity.ts, Stripe PROD)

- Airtable: `total_cuotas: 4`, `payment_status: "Cuota 3 pagada"`,
  `portal_access: true`, `status: Inscrita`.
- Stripe: sub `sub_1TNCh9...` activa, $224.25/mes, 4 facturas (3 pagadas + 1 open
  que vence 2026-08-17). `cancel_at: 2026-08-17`. `metadata: {}`.

## Lo que se hizo

1. **`src/lib/airtable.ts`**: expuse `total_cuotas` en `FounderProfile` y lo leo
   en `getFounderProfile` desde la postulación.
2. **`src/app/portal/suscripcion/page.tsx`**: paso `totalCuotasAirtable` al
   cliente.
3. **`src/app/portal/suscripcion/suscripcion-client.tsx`**:
   - `subTotalCuotas = totalCuotasAirtable ?? sub.totalCuotas ?? null` (Airtable
     manda; Stripe fallback).
   - `puedeCancel = haPagado` (baja siempre, con o sin cuotas completas / pago
     único).
   - Nuevo `yaAbonadoCompleto` solo para el **copy** (mensaje distinto), no para
     bloquear la baja.
   - Eliminé el bloque muerto "Tu programa está completamente abonado".
   - El endpoint `/api/stripe/cancel` ya maneja el churn con o sin sub cancelable.

## Verificación

- `tsc --noEmit`: 17 errores en `airtable.ts` **preexistentes** (tipado SDK
  Airtable), 17 antes y 17 después → cero nuevos. Cero errores en los archivos
  de suscripción.
- Simulación de la lógica con datos reales (4 casos): Maity "3 de 4" + botón
  visible ✅; founder 3/3 terminado botón visible + copy "ya abonado" ✅; pago
  único botón visible ✅; founder 1/3 en curso normal ✅.

## Verificación pendiente (validar en PROD tras merge)

- [ ] Maity ve "3 de 4" y su próximo cobro (17-ago).
- [ ] Maity ve el botón "Darme de baja del programa".
- [ ] Founder con todo pagado / pago único también ve el botón con copy correcto.
- [ ] Al dar de baja: cancela sub en Stripe (si aplica), pierde portal_access,
      sale de eventos de Calendar, recibe correo de churn.

## MAA

- **Medir**: ¿cuántos founders con plan ≠ 3 cuotas o ya-pagado NO podían darse de
  baja? Al menos Maity (4 cuotas). El campo `total_cuotas` de Airtable es la
  fuente de verdad; el portal la ignoraba.
- **Analizar**: el hardcode de "3 cuotas" venía del diseño original (F5,
  OP-1005) cuando solo existía el plan de 3. Los planes de 4 cuotas rompieron el
  supuesto.
- **Actuar**: usar `total_cuotas` real + baja siempre disponible. Próxima vuelta:
  auditar cuántos founders tienen `total_cuotas` ≠ 3 para detectar otros casos.
