---
titulo: "Portal founders: baja del programa unificada, fix suscripción y ajustes UI"
fecha: 2026-07-07
proyecto: modoFundraising
estado: pendiente-validacion
tipo: fix + mejora
tags: [portal, suscripcion, churn, pago-unico, stripe, airtable, ui]
---

## Objetivo

Corregir un bug de confusión en el portal de founders donde la sección de
suscripción se contradecía a sí misma ("US$349/mes · 3 cuotas" en el encabezado
vs "Pago único — sin renovaciones automáticas" abajo), y unificar el flujo de
salida del programa para que **todos** los founders (cuotas y pago único) puedan
darse de baja con encuesta de salida obligatoria. Más dos ajustes menores de UI
solicitados en el portal.

## Contexto: el bug de fondo

El webhook de Stripe marca el **pago único** (`mode=payment`) con
`payment_status = "Cuota 3 pagada"` — el mismo valor que una suscripción de 3
cuotas ya terminada (ver [webhook/route.ts:138](../../src/app/api/stripe/webhook/route.ts)).
Por eso el portal no podía distinguir ambos casos y:

1. El encabezado del estado activo estaba hardcodeado como "US$349/mes · 3 cuotas".
2. El pie de página adivinaba mal con la heurística `paymentStatus === "Cuota 3 pagada"`.
3. El endpoint de cancelación devolvía **404** para pago único (no hay
   subscription de Stripe que cancelar), así que el pago único **no podía salir
   del programa** y su motivo de salida nunca se capturaba.

**Discriminador correcto encontrado:** `stripe_subscription_id`. El pago único
nunca crea una subscription en Stripe, así que ese campo vacío = pago único;
presente = suscripción de cuotas.

## Semántica de estados de churn (validada)

- **`Churn`** = baja involuntaria / del sistema: falla de pago en el webhook
  ([webhook:71](../../src/app/api/stripe/webhook/route.ts)) o cron de cobranza
  sin recuperación ([cobranza:77](../../src/app/api/cron/cobranza/route.ts)).
- **`Churn By Founder`** = baja voluntaria: el founder se da de baja desde el
  portal ([cancel:79](../../src/app/api/stripe/cancel/route.ts)).

La distinción es **quién** inicia la baja (sistema vs founder), no el momento.
El pago único que se da de baja voluntariamente sigue siendo `Churn By Founder`
(es correcto: fue su decisión).

## Decisiones tomadas (con Gabriel)

1. **Texto del botón unificado para todos:** "Darme de baja del programa" (antes
   "Cancelar suscripción"). Queda claro tanto para cuotas como para pago único.
2. **Advertencia extra antes de confirmar** para el pago único: "tu pago único
   ya está abonado y no hay reembolso".
3. **Encuesta de salida SIEMPRE antes de confirmar** la baja (ya era obligatoria;
   se mantiene y refuerza en dos capas: UI + validación del endpoint).

## Lo que se hizo

### 1. Fix de suscripción + baja unificada
`src/app/portal/suscripcion/suscripcion-client.tsx`
- `esPagoUnico = haPagado && !stripeSubscriptionId` — detección robusta.
- `cuotasCompletas` ahora excluye el pago único (`!esPagoUnico`), para que el
  pago único NO quede marcado como "completado" y sí pueda darse de baja.
- `puedeCancel = haPagado && !cuotasCompletas` — aplica a todo founder activo
  que no completó cuotas (incluye pago único).
- Encabezado dinámico: "Pago único · US$837" vs "US$349/mes · 3 cuotas".
- Botón "Darme de baja del programa" + textos de encuesta/confirmación/toast
  adaptados por caso (cuotas → "se detuvieron los cobros futuros"; pago único →
  "se cerró tu acceso", con advertencia de no-reembolso).

### 2. Endpoint de baja soporta pago único
`src/app/api/stripe/cancel/route.ts`
- Antes: sin subscription de Stripe → error 404 (bloqueaba al pago único).
- Ahora: si hay subscription la cancela (detiene cobros); si no la hay (pago
  único), igual ejecuta el churn — pierde acceso, sale de eventos de Calendar,
  guarda el motivo en Airtable y manda email de baja.
- La encuesta sigue siendo obligatoria: el endpoint rechaza cualquier baja sin
  `reasonCode` válido.

### 3. Ajustes UI del portal
- `src/app/portal/equipo/equipo-client.tsx` — eliminado el título
  "Miembros (N)"; el recuadro va directo a la lista de integrantes.
- `src/app/portal/startup/page.tsx` — icono en cada recuadro de datos clave
  (Etapa, Ronda, Tamaño de ronda, Runway, Industrias, Modelo de negocio). Antes
  solo 4 de 10 tenían icono.

## Dónde queda la encuesta de salida

Tabla **Rechazos MF26** en Airtable (`tblnlhYJ6F108NxHN`,
[airtable.ts:33](../../src/lib/airtable.ts)). Se crea con `createRechazoRecord()`
([airtable.ts:2479](../../src/lib/airtable.ts)). Campos: `reason_code`,
`reason_label`, `detail` (texto libre de "Otro"), `email`, `created_at`, y links
a Startup / Postulacion / Founder.

Se lee en el admin en **`/admin/churn`**
([admin/churn/page.tsx](../../src/app/admin/churn/page.tsx)): tarjetas resumen
(total churn, en ventana 14d, motivo dominante, monto en riesgo) + tabla con
filtro por motivo. Con estos cambios, las bajas de pago único aparecen aquí
automáticamente (antes no podían salir → cero visibilidad).

## Archivos modificados

- `src/app/portal/suscripcion/suscripcion-client.tsx`
- `src/app/api/stripe/cancel/route.ts`
- `src/app/portal/equipo/equipo-client.tsx`
- `src/app/portal/startup/page.tsx`

## MAA — Medir / Analizar / Actuar

- **Medir:** distribución de motivos de salida (`reason_code`) y tasa de bajas
  con motivo capturado. Sensor = página `/admin/churn` (motivo dominante + %).
- **Analizar:** antes el pago único no podía darse de baja → 0% de sus motivos
  se capturaban. Base de comparación = distribución de motivos en Rechazos MF26
  semana a semana.
- **Actuar:** con el fix, se captura el 100% de las bajas (cuotas + pago único).
  Revisar en el cierre semanal si el motivo dominante sugiere ajuste de precio,
  scope o expectativas del programa.

## Verificación

- [x] `tsc --noEmit` limpio en los 4 archivos modificados (errores restantes son
      preexistentes en `scripts/` y otros, ajenos a estos cambios).
- [x] `eslint` limpio en suscripcion-client.tsx y cancel/route.ts.
- [ ] **Validación manual de Gabriel ANTES de mandar a main:**
  - [ ] Founder en test con pago único: ve "Pago único · US$837", botón "Darme
        de baja del programa", encuesta con advertencia de no-reembolso.
  - [ ] Founder con cuotas activas: ve "US$349/mes · 3 cuotas", botón de baja,
        encuesta sin la advertencia de no-reembolso.
  - [ ] Al darse de baja, aparece en `/admin/churn` con su motivo.
  - [ ] Portal Equipo: sin título "Miembros (N)".
  - [ ] Portal Mi Startup: todos los recuadros con icono.

## Pendiente

- Commit preparado pero **NO enviado a main** — esperando validación de Gabriel.
