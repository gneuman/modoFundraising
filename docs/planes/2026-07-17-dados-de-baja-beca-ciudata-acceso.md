---
titulo: "Dados de baja + reactivar sin cobro, fix beca 100%, y fix acceso Ciudata"
fecha: 2026-07-17
proyecto: modoFundraising
estado: en-progreso
tipo: feature + fix + fix-datos
tags: [portal_access, churn, reactivacion, beca, onboarding, calendario, airtable, stripe, ciudata, OP-2153, OP-2154, OP-2155, OP-2167]
---

## Objetivo

Atender los 3 pendientes 🔴 P1 del 17-jul reportados por la clienta:

1. **Dados de baja por no pago invisibles + reactivación sin cobro** (caso `kawesqartravel@gmail.com`, paga 18-jul): poder identificar a los dados de baja por no-pago y reactivarles el acceso manualmente sin generar un cobro duplicado, y que al pagar vuelvan al flujo (misiones, asistencia, pagos).
2. **Beca 100%: mail desactualizado + no llega acceso al portal.**
3. **Founders de Ciudata sin sesiones agendadas.**

## Contexto del sistema (fuente de verdad)

Este proyecto **NO usa Supabase** para founders/startups. La fuente de verdad es **Airtable** (tablas `MF26`: Postulaciones, Founders, Startups, Pagos) + **Stripe**. Modelo en `src/lib/airtable.ts`.

- El **gate de acceso al portal y al calendario se rige por `portal_access` del FOUNDER** (`getFounderProfile` → `f.portal_access`, `airtable.ts:706`), no por el de la postulación.
- Allowlist de status con acceso (`STATUS_CON_ACCESO`, `airtable.ts:87-91`): `Inscrita`, `Invitada institucional`, `Admitida`.
- La baja por no-pago (webhook `invoice.payment_failed` attempt≥4, o cron `cobranza`) deja: Postulación `status="Churn"` + `portal_access=false`; Founders `portal_access=false`; Startup `status="Churn"`; y saca del calendario. Estampa `payment_failed_at`.
- El churn voluntario usa `status="Churn By Founder"` y NO estampa `payment_failed_at`.

## Lo que se hizo

### OP-2153 — Dados de baja por tipo + botón "Reactivar sin cobro" ✅ MERGEADO (#67)

- `/admin/churn` reenfocada como **"Dados de baja"**: deriva `tipoBaja` (`no_pago` = Churn + `payment_failed_at`; `voluntaria` = Churn By Founder; `manual` = Churn sin `payment_failed_at`). Filtro por tipo, badge, card contador "Baja por no pago".
- Nueva acción `PATCH /api/admin/applications` con `action: "reactivate_no_charge"`: deja la postulación en **"Admitida"** + `portal_access=true`, **limpia** sensores de cobranza (`payment_failed_at`, `payment_resolved_at`, `payment_reminder_1/2/3_at`), activa founders, marca startup Inscrita, reinvita a calendar (S1/S2). **NO toca Stripe** → no puede duplicar cobro. Deja rastro en `churn_reason`.
- Por qué "Admitida": otorga acceso (banner de pago pendiente) y el cron de cobranza lo ignora (solo procesa "Inscrita"), evitando re-suspensión por el `payment_failed_at` viejo.
- El cobro del founder lo maneja el flujo existente `/admin/recuperar-pagos` (billing_portal si la sub sigue viva, checkout one-time si fue cancelada). El webhook de pago es idempotente respecto al status.
- Botón `reactivate-button.tsx` (patrón de `refund-button.tsx`), muta solo vía endpoint.

### OP-2154 — Fix beca 100% ✅ MERGEADO (#68)

- **Bug:** la beca (`applications/route.ts`, admitida con `discount_percent===100`) solo mandaba `sendPaymentConfirmation` (correo de "pago recibido", desactualizado para un becado, con banner anti-doble-pago sin sentido) y **nunca activaba `portal_access` en los founders ni mandaba el onboarding** → por eso no llegaba el acceso.
- **Fix:** la beca ahora `activateAllFoundersForApplication` + startup Inscrita + invita calendar + `sendOnboardingForStartup` (correo con el link de acceso, idempotente por `onboarding_enviado_at`). Se elimina el correo de pago del flujo de beca.
- **Nota:** el contenido del template `onboarding` vive en Airtable; si tiene texto viejo se ajusta ahí.

### OP-2155 — Fix acceso Ciudata ✅ APLICADO Y VALIDADO

- **Diagnóstico:** Ciudata quedó en estado inconsistente tras su anomalía de doble-suscripción (ver `docs/planes/2026-07-06-auditoria-suscripciones-mf26.md`): postulación `Inscrita` + `Cuota 3 pagada` + sub Stripe viva, PERO startup `Churn` y todos los founders con `portal_access=false` → el cron `sync-attendees` no los agendaba. brissia había perdido el link a la startup. Además había founder-records duplicados (diego ×2, brissia ×3).
- **Fix (script `scripts/fix-ciudata-acceso.ts`, idempotente, dry-run por defecto):** `portal_access=true` en los 3 founders buenos (camila `rechZFnbzjgIrU4dB`, diego `recD3xMniru2bgXj9`, brissia `rec3wYjkK2V7L9PtD`), religa brissia buena a Ciudata (`recBEK2OHONfV1N99`), startup Churn → Inscrita, postulación `portal_access=true`. NO toca Stripe ni los duplicados.
- **Validado contra Airtable real:** los 3 con `portal_access=SÍ` y ligados a Ciudata; startup y postulación en Inscrita. El cron `sync-attendees` los reagenda solo.

### Hallazgo del barrido (MAA) → OP-2167

Antes de tocar Ciudata se corrió un **barrido de las 88 postulaciones** buscando el estado inconsistente. Resultado: **13 startups**, clasificadas:

- **Grupo A (8):** `portal_access` postulación=NO pero founders=SÍ → acceso real OK (campo desincronizado, cosmético). NO son bugs. (Zeii, PIXLAB, Finsphera, LEAF, Aventia, Antü, Tophunting, Impact Core)
- **Grupo B (3):** founder `portal_access=NO` pese a Inscrita/Beca pagada → bugs reales de acceso. (Ciudata → arreglada aquí; **Tributo Simple** y **Pura Mente** → víctimas del bug de beca OP-2154, quedaron sin acceso — pendientes)
- **Grupo C (2):** churn/Money Back legítimo, NO tocar. (Aksas = churn no-pago; DREX = Money Back)

Se creó **OP-2167**: una vista en el admin para que el equipo resuelva estas inconsistencias por sí mismo (paridad API↔UI), en vez de arreglarlas a mano. Tributo Simple y Pura Mente se resolverán con esa vista o con el mismo script.

## Archivos modificados

- `src/app/admin/churn/page.tsx` — vista Dados de baja por tipo (OP-2153)
- `src/app/admin/churn/churn-filters.tsx` — filtro por tipo de baja (OP-2153)
- `src/app/admin/churn/reactivate-button.tsx` — botón reactivar sin cobro (OP-2153, nuevo)
- `src/app/api/admin/applications/route.ts` — acción `reactivate_no_charge` (OP-2153) + fix beca (OP-2154)
- `scripts/fix-ciudata-acceso.ts` — fix de datos Ciudata (OP-2155, nuevo)
- `docs/sop/reactivar-founder-y-fix-acceso.md` — SOP (nuevo)

## MAA

- **Medir:** # de founders que recuperan acceso y pueden pagar sin cobro duplicado; # de startups en estado inconsistente (hoy 13; bugs reales de acceso: 3).
- **Analizar:** las inconsistencias nacen de 3 causas recurrentes: doble-suscripción, bug de beca (ahora corregido), churns mal disparados. El barrido es el sensor.
- **Actuar:** OP-2153 da la herramienta de reactivación; OP-2154 corta la causa "beca"; OP-2167 da el sensor+corrección continuos. El gap de inconsistencias debe tender a 0.

## Verificación pendiente

- [ ] **kawesqar:** reactivación en vivo en la llamada del **lunes 20-jul** desde `/admin/churn` → filtro "No pago" → "Reactivar sin cobro" (validación real de OP-2153). Pedido explícito de Gabriel.
- [ ] **Beca 100%:** validar con un caso real que el becado recibe onboarding y entra al portal (OP-2154).
- [ ] **Ciudata:** confirmar que `sync-attendees` reagendó a los 3 founders a las clases futuras (revisar Google Calendar tras la próxima corrida del cron).
- [ ] **Tributo Simple + Pura Mente:** reactivar acceso (via OP-2167 o script).
- [ ] **Higiene de datos:** limpiar founder-records duplicados de diego/brissia (ticket aparte).
