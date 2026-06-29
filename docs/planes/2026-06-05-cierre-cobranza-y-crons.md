---
titulo: Cierre — sistema de cobranza, sub-health, recuperar pagos y crons n8n
fecha: 2026-06-05
proyecto: modoFundraising
estado: parcial
tipo: feature
tags: [cobranza, stripe, airtable, cron, n8n, billing-portal, admin, revenue]
---

## Objetivo

Cerrar el sistema de cobranza end-to-end de MF26: detección automática de
pagos colgados, herramienta admin para mandar links de pago a founders que no
tienen acceso al portal, crons en n8n encadenados, y un campo Airtable más
visible para los recordatorios de form abandonado.

## ✅ Lo que SÍ se hizo (vivo en producción)

### 1. Sección "Recuperar pagos" en `/admin/revenue`

- **UI nueva**: [src/app/admin/revenue/recuperar-pagos-section.tsx](src/app/admin/revenue/recuperar-pagos-section.tsx) montada en [revenue/page.tsx](src/app/admin/revenue/page.tsx)
- **Backend**: [src/app/api/admin/recuperar-pagos/route.ts](src/app/api/admin/recuperar-pagos/route.ts)
  - `GET` → diagnóstico cruzando Airtable ↔ Stripe ↔ Pagos MF26
  - `POST { airtableId, kind: "billing_portal" }` → genera link Stripe Billing Portal
  - `POST { airtableId, kind: "checkout", amountUsd, description }` → genera Checkout one-time con monto custom
- **Lógica de decisión** ([route.ts:70-131](src/app/api/admin/recuperar-pagos/route.ts#L70)):
  - `beca` (100%) y `completado` (todas las cuotas pagadas) → **ocultas**, no requieren acción
  - `billing_portal` → tarjeta falló en sub past_due/unpaid/incomplete
  - `checkout` → sub cancelada o sin sub Stripe, faltan cuotas
  - `ok_auto` → Stripe cobra solo en próxima cuota
  - `revisar` → casos raros que requieren ojo humano
- **Fuente de verdad de cuotas**: `max(Stripe, Airtable Pagos)` — soporta pagos por fuera de Stripe (transferencia, manual, etc.) que solo están en Airtable
- **UX**: filtro "Solo con problema" por default, botón Generar por fila → Copiar link / abrir en pestaña nueva

### 2. Cron `/api/cron/sub-health`

- **Archivo**: [src/app/api/cron/sub-health/route.ts](src/app/api/cron/sub-health/route.ts)
- **Responsabilidad**: red de seguridad para suscripciones que NO pasan por el flujo normal del webhook
- **Auth**: `Authorization: Bearer <CRON_SECRET>`
- **GET** → dry-run (no escribe)
- **POST** → ejecuta
- **Acciones por suscripción**:
  1. `past_due`/`unpaid` sin `payment_failed_at` → marca `payment_failed_at` para que el cron `/cobranza` arranque sus recordatorios
  2. Factura `open` con `attempts=0` y `due_date <= ahora` (o sin due_date) → intenta `stripe.invoices.pay()` si hay tarjeta default. Si falla o no hay tarjeta, marca `payment_failed_at`
  3. Más facturas pagadas que `total_cuotas` → email al admin (`ADMIN_ALERT_EMAIL` o `admin@impacta.vc`). No cancela nada automático
- **Fix importante** (commit `4f53afc`): respeta `due_date`. NO cobra anticipadamente facturas con plazo vigente (caso Antü: factura vence 12-jun, el cron no la toca hasta esa fecha)

### 3. Bug fix en `/admin/revenue`: ocultar startups que no requieren acción

- Las completadas (3/3, 4/4, pago único) y becas 100% NO aparecen en la tabla — antes salían como "Generar Checkout" por error
- Detección: `accion === "completado" || accion === "beca"` → filtradas
- Línea informativa abajo: "Ocultas: X completadas · Y becas — no requieren acción"

### 4. Campo Airtable: `form_reminder_sent` (checkbox visual)

- **Tabla**: `Postulaciones MF26`
- **Tipo**: formula `{form_reminder_sent_at} != BLANK()` (resultType: number, formato display como checkbox)
- **Para qué**: ver de un vistazo en la grid cuáles ya recibieron el recordatorio de form abandonado, sin tener que mirar el timestamp
- **Script generador**: [scripts/add-form-reminder-checkbox.ts](scripts/add-form-reminder-checkbox.ts)

### 5. Scripts auxiliares de diagnóstico (read-only)

- [scripts/audit-retomar-pagos.ts](scripts/audit-retomar-pagos.ts) — auditoría inicial de las 8 startups con pago negociado a mano
- [scripts/audit-subs-completadas.ts](scripts/audit-subs-completadas.ts) — detecta subs vivas con todas las cuotas pagadas
- [scripts/audit-3-bugs.ts](scripts/audit-3-bugs.ts) — verifica esquema Airtable + estado actual de followups + caso Zavia Bio
- [scripts/check-maity.ts](scripts/check-maity.ts), [scripts/check-antu.ts](scripts/check-antu.ts) — inspección end-to-end por founder
- [scripts/check-email-pago-fallido.ts](scripts/check-email-pago-fallido.ts) — lee templates de Airtable
- [scripts/dryrun-sub-health.ts](scripts/dryrun-sub-health.ts) — dry-run del cron sub-health sin servidor activo

## ⚠ Lo que queda PENDIENTE

### A. Activar workflows n8n (lo más importante)

**3 workflows necesarios**:

1. **Form reminder** — `POST /api/cron/form-reminder` cada **30 min**
   - Detecta drafts de postulación abandonados ≥1h
   - Manda email "termina tu postulación"
   - Ya está en n8n pero hay que verificar que el secret esté completo

2. **Followup admisión** — `POST /api/cron/followup` cada **30 min**
   - Manda follow-ups 1 y 2 a admitidas sin pago
   - Cierra postulaciones como "Sin Respuesta" después del follow-up 2 + 2 días
   - **Estado actual (2026-06-05)**: workflow en n8n quedó en GET (preview-only). Galatea AI lista para recibir follow-up 2 cuando se cambie a POST
   - Schedule recomendado: cada 30 min, no a hora fija — permite que cada founder reciba su email cerca de la hora original de admisión

3. **Cobranza encadenada** — secuencial cada **24h** (mañana 9-10 AM):
   - **Paso 1**: `POST /api/cron/sub-health` — detecta subs colgadas, marca `payment_failed_at`, cobra facturas vencidas con tarjeta default
   - **Paso 2** (con 30-60s delay): `POST /api/cron/cobranza` — manda recordatorios escalonados a quienes tienen `payment_failed_at`
   - **Sub-health DEBE correr antes que cobranza** — si no, cobranza no se entera de las subs nuevas en past_due que sub-health detecta

**⚠ Acción de seguridad pendiente**: rotar `CRON_SECRET` en Vercel. El secret actual quedó expuesto en logs/JSONs durante el armado.

### B. Email de cobranza sin link autoservicio

- **Plan separado**: [docs/planes/2026-06-04-pago-fallido-link-autoservicio.md](docs/planes/2026-06-04-pago-fallido-link-autoservicio.md)
- **Branch**: `feature/pago-fallido-link-autoservicio` (`4c228a2`)
- **Decisión 2026-06-04**: dejar templates como están. Hoy los emails `pago_fallido_1/2/3` piden al founder escribir a `nmacchiavello@impacta.vc`. Cuando se vea fricción real o se den acceso al portal, agregar botón "Pagar/Actualizar tarjeta" con link Billing Portal generado al vuelo

### C. Casos puntuales por resolver manualmente

| Startup | Estado | Acción |
|---|---|---|
| **Zavia Bio** | `total_cuotas` está en `undefined` pero pagó completo (US$837.60) — aparece como "faltan 2 pagos" | Setear `total_cuotas=1` en Airtable. Después de eso cae en `completado` y desaparece de Recuperar pagos |
| **Kawesqar Travels** | No aparece en `Postulaciones MF26` con ese nombre exacto | Buscar bajo qué nombre está registrada (¿cambió a "Intelligence Hub"?). En `audit-retomar-pagos` salió "❌ NO ENCONTRADA" |
| **Zeii** y **Aventia** | Marcadas "Cuota 1 pagada" en Airtable, sin facturas en Stripe | Confirmar con Gabriel si pagaron por transferencia/MercadoPago. Si sí, dejarlas. Si no, generar Checkout desde admin/revenue |
| **PIXLAB, Maity** | Tarjeta falló — botón Billing Portal disponible en admin/revenue | Mandar link por WhatsApp/email cuando el equipo decida |
| **Antü** | Factura vence 12-jun, sub-health no actúa hasta esa fecha | Esperar. Si llega el 12-jun sin pagar, sub-health la cobra automático con su Visa **** 3654 |

## Cómo dar soporte después (mapa rápido)

### "El founder X dice que no le llega el email de pago fallido"

1. Verificar Airtable `Postulaciones MF26`:
   - `payment_failed_at` debe tener fecha
   - `payment_reminder_1_at`, `_2_at`, `_3_at` indican cuántos avisos recibió
2. Si `payment_failed_at` está vacío pero Stripe dice past_due:
   - El webhook `invoice.payment_failed` no disparó (caso `send_invoice`)
   - **Sub-health** debería detectarlo en su próxima corrida
   - Verificar logs del workflow n8n `sub-health`
3. Si todo está marcado pero el founder dice que no recibió:
   - Revisar logs Gmail (`admin@impacta.vc`)
   - Verificar que la regla en `Automation Rules MF26` esté `active=true` para `payment_failed_1/2/3`

### "El admin necesita cobrar a un founder hoy"

1. Abrir [/admin/revenue](https://portal.modofundraising.com/admin/revenue) → sección "Recuperar pagos"
2. Buscar la startup. Filtro "Solo con problema" por default — si no aparece, cambiar a "Todas"
3. Si dice **Tarjeta falló (naranja)** → botón "Generar" → copia link → manda por WhatsApp/email
4. Si dice **Generar Checkout (morado)** → botón "Checkout" → entra monto → copia link → manda

### "Una startup ya pagó pero aparece como pendiente en /admin/revenue"

1. Verificar en Airtable `Pagos MF26` que el pago esté registrado (email + startup_name coinciden con la postulación)
2. Verificar `total_cuotas` en la postulación — si es `undefined` o el número incorrecto, ahí está el problema
3. Setear `total_cuotas` correcto a mano

### "Stripe le cobró de más a alguien"

1. Recibirías email automático del cron sub-health al admin (asunto: "⚠ MF26 — Sobre-cobro detectado")
2. Ir a Stripe Dashboard → buscar customer → cancelar suscripción
3. Si correspondiera, reembolsar facturas de más

## MAA

- **Medir**:
  - Cuotas cobradas vía sub-health (`actions.cobrado` count en logs n8n)
  - Recordatorios disparados por cobranza (`actions` array)
  - Links generados desde admin/revenue (logs Vercel `POST /api/admin/recuperar-pagos`)
  - Founders que pagan en <48h después de recibir email de cobranza
- **Analizar**: base anterior = todo manual, sin visibilidad. Ahora deberíamos ver tasa de auto-resolución
- **Actuar**: si <40% resuelve solo, activar el plan de link autoservicio en emails (branch ya listo)
