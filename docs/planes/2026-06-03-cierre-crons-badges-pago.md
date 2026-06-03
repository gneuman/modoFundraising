---
titulo: Cierre — crons n8n, badge Beca 100%, recuperación de pago fallido
fecha: 2026-06-03
proyecto: modoFundraising
estado: completado-desplegado
tipo: feature
tags: [cron, n8n, airtable, stripe, portal, health-check, beca]
---

## Objetivo

Cerrar 6 hallazgos operativos de Modo Fundraising 2026: emails automáticos que no
se mandaban, recuperación de pago, y el estado mal mostrado de becas 100% en el
Health Check.

## Lo que se hizo

1. **Crons activados vía n8n** (no Vercel Cron: plan Hobby limita a 1/día).
   - 3 endpoints en `portal.modofundraising.com/api/cron/{form-reminder,followup,cobranza}`,
     POST + `Authorization: Bearer <CRON_SECRET>`. CRON_SECRET en Vercel.
   - Probados en vivo: form-reminder (Quintil Valley + 10 reactivadas),
     followup (Galatea AI, Zavia Bio → follow_up_1), cobranza (processed:0, sin fallos).
   - Anti-reenvío por `form_reminder_sent_at` validado.

2. **Punto 5 — Badge "Beca 100%"** (`health-check-table.tsx`):
   - Inscritas con beca 100% muestran badge morado, distinto de quien pagó.

3. **payment_status propio para becas**:
   - Nuevo valor `"Beca 100%"` en `PaymentStatus`. Al admitir con discount=100,
     `api/admin/applications` lo setea (ya no queda "Pendiente").
   - `scripts/backfill-beca100.ts` migró BioClé y Bifidice (verificado en Airtable).
   - No afecta revenue (sale de tabla Pagos) ni cobranza (filtra por payment_failed_at).

4. **Punto 4 — Recuperación de pago fallido**:
   - `POST /api/portal/billing-portal`: el founder logueado genera link al Stripe
     Billing Portal para actualizar tarjeta.
   - Estado "pago fallido" + botón "Actualizar tarjeta" en `/portal/suscripcion`,
     visible con `payment_failed_at` sin `payment_resolved_at`.

## Archivos modificados

- `src/app/api/cron/*` (ya existían; activados por config)
- `src/components/admin/health-check-table.tsx` (badge)
- `src/lib/airtable.ts` (PaymentStatus + FounderProfile payment_failed/resolved_at)
- `src/app/api/admin/applications/route.ts` (payment_status beca)
- `src/app/api/portal/billing-portal/route.ts` (nuevo)
- `src/app/portal/suscripcion/{page,suscripcion-client}.tsx` (botón pago fallido)
- `scripts/{premarcar,reactivar,backfill}-*.ts` (operación)

## Verificación

- Deploy en main (commit 1091893). Endpoints responden desde Vercel (401 sin auth).
- BioClé y Bifidice en Airtable: `payment_status="Beca 100%"`, `esBeca100()=true`.
- Build: `✓ Compiled successfully` (fallo local solo por falta de STRIPE/SENTRY env, no código).

## Pendiente

- Captura visual del badge en `/admin/dashboard` (requiere login admin — lo hace Gabriel).
- Probar botón pago fallido end-to-end cuando haya un fallo real (hoy nadie tiene payment_failed_at).
- n8n: confirmar que los 3 workflows quedaron con schedule activo.

## MAA

- **Medir**: emails enviados (n8n logs) + casillas Airtable; tasa recuperación form;
  becas correctamente marcadas vs "Pendiente".
- **Analizar**: base anterior = 0 emails automáticos, becas mostrando "Pendiente".
- **Actuar**: ajustar timing de crons y copy según conversión.
