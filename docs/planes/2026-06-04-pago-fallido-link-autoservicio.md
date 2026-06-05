---
titulo: Emails pago_fallido — agregar link autoservicio (Billing Portal)
fecha: 2026-06-04
proyecto: modoFundraising
estado: pendiente
tipo: feature
tags: [cobranza, email-templates, stripe, billing-portal, ux]
---

## Objetivo

Que los emails `pago_fallido_1`, `pago_fallido_2`, `pago_fallido_3` que dispara
el cron `/api/cron/cobranza` permitan al founder **pagar/actualizar tarjeta en
un click**, sin tener que escribir a `nmacchiavello@impacta.vc` y esperar
respuesta manual.

## Contexto (estado actual — 2026-06-04)

- Cron `cobranza` ya manda los 3 avisos escalonados (día 0, +2, +5) y suspende
  en día +8. Funciona, está en main, falta activar workflow n8n.
- Templates en Airtable (`Email Templates MF26`) hoy **no llevan link**: solo
  texto + `mailto:nmacchiavello@impacta.vc`. El founder no puede actuar solo.
- `sendPaymentFailedEmail` en [email-engine.ts](src/lib/email-engine.ts#L277) ya
  pasa `portal_url` como variable, pero el template no la usa.
- Founders aún no tienen acceso al portal del programa
  (`/portal/suscripcion`) — por eso no sirve apuntar ahí todavía.
- En `/admin/revenue` la sección "Recuperar pagos" ya genera Billing Portal
  links a demanda. La misma lógica (`createBillingPortalLink`) se puede usar
  desde el cron.

Decisión 2026-06-04: dejar templates como están y abrir este plan para más
adelante. Riesgo de tocarlos ahora con MF26 ya en producción y founders
arrancando cobranza esta semana.

## Lo que habría que hacer

1. **Modificar [`/api/cron/cobranza`](src/app/api/cron/cobranza/route.ts)**
   antes de llamar `sendPaymentFailedEmail`:
   - Resolver `customerId` (Airtable `stripe_customer_id` → fallback search
     por email).
   - Llamar `createBillingPortalLink(customerId, returnUrl)`.
   - Pasar la URL como `portal_url` (override del default que apunta a
     `/portal`).
   - Edge case: sin customer Stripe → mandar el email viejo sin link (no
     bloquear el envío).

2. **Editar templates en Airtable** (`Email Templates MF26` → `body_html`):
   - `pago_fallido_1`: agregar botón "Actualizar mi tarjeta" con
     `{{portal_url}}`. Mantener mailto a Nadia como footer pequeño "si
     necesitás ayuda".
   - `pago_fallido_2`: botón "Pagar ahora" + recordar urgencia.
   - `pago_fallido_3`: botón "Resolver pago" + tono de último aviso.
   - Estilo: botón inline tipo CTA de Stripe (azul `#2563eb`, padding 12x20,
     radius 6).

3. **Considerar también `portal_deactivated`** (cuando suspende en día +8):
   ahora dice solo "tu portal fue desactivado" — agregar botón "Reactivar
   pagando ahora" con el link Billing Portal, por si quiere recuperar acceso.

## Cuándo retomarlo

Cuando se cumpla alguna de estas:
- Tengamos 3+ casos de founders escribiendo a Nadia por pago fallido
  (señal de fricción real).
- Founders tengan acceso al portal del programa (entonces el link puede ir a
  `/portal/suscripcion` que ya tiene el botón "Actualizar tarjeta").
- Antes de la próxima cohorte para que MF27 arranque con autoservicio.

## MAA

- **Medir**: tasa de pago fallido resuelto en <48h (hoy con email actual vs
  futuro con link). Métricas: emails `pago_fallido_*` enviados (n8n logs) +
  `payment_resolved_at` set dentro de 2 días.
- **Analizar**: cuántos resuelven solos vs cuántos escriben a Nadia.
  Base = 0% autoservicio hoy.
- **Actuar**: si <40% resuelven solos con el link, mejorar el copy del botón
  o agregar SMS/WhatsApp como segundo canal.
