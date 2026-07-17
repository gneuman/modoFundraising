---
titulo: "SOP — Reactivar founders y corregir acceso al portal/calendario"
proyecto: modoFundraising
actualizado: 2026-07-17
audiencia: admin (Impacta / GNB) + agentes
tags: [SOP, portal_access, churn, reactivacion, beca, calendario, airtable, stripe]
---

# SOP — Reactivar founders y corregir acceso

Guía operativa para los casos más comunes de "un founder no tiene acceso / no aparece / no le llegan sesiones". Cubre reactivación de dados de baja, becas, e inconsistencias de acceso.

## Conceptos base (leer una vez)

- **Fuente de verdad:** Airtable (`MF26`) + Stripe. NO Supabase.
- **El acceso lo manda `portal_access` del FOUNDER** (no el de la postulación). Si el founder tiene `portal_access=true` y su status otorga acceso, entra al portal y el cron lo agenda al calendario.
- **Status que otorgan acceso:** `Inscrita`, `Invitada institucional`, `Admitida`.
- **Baja por no-pago** deja huella `payment_failed_at` en la postulación. **Baja voluntaria** = status `Churn By Founder` (sin `payment_failed_at`).
- **Crons que mantienen el calendario:** `sync-attendees` (agrega a founders con `portal_access=1` a clases futuras) y `reconciliar-calendario` (saca a los que perdieron acceso). Corren solos; tras corregir `portal_access` no hace falta invitar a mano, pero puede tardar hasta la próxima corrida.

---

## Caso 1 — Reactivar un dado de baja SIN generar cobro

**Cuándo:** un founder fue dado de baja por no pagar (aparece en `/admin/churn` como "No pago") y hay que devolverle el acceso aunque no haya pagado todavía (ej. pagará en unos días).

**Pasos (desde el admin, sin tocar Airtable ni Stripe):**

1. Entrar a **`/admin/churn`** (menú "Dados de baja").
2. Filtro **"No pago"**.
3. Encontrar al founder (por startup/email) y click **"Reactivar sin cobro"** → confirmar.

**Qué hace por dentro** (acción `reactivate_no_charge`):
- Deja la postulación en **"Admitida"** con `portal_access=true`.
- Limpia los sensores de cobranza para que el cron no lo vuelva a suspender.
- Activa `portal_access` en todos los founders, marca la startup Inscrita, reinvita a S1/S2.
- **NO toca Stripe** → no hay cobro duplicado.

**Cómo paga después:** el founder regulariza por su cuenta. Si su suscripción sigue viva (`past_due`), actualiza tarjeta en el **billing portal**; si fue cancelada, paga por un **checkout one-time**. Ambos caminos salen de **`/admin/recuperar-pagos`**, que diagnostica el estado real de la sub en Stripe. Al pagar, el webhook lo procesa y vuelve al flujo normal (misiones, asistencia, pagos) sin duplicar.

> ⚠️ NO generes un checkout nuevo "por si acaso" si la sub sigue viva — eso sí duplicaría. Deja que `recuperar-pagos` elija el camino correcto.

---

## Caso 2 — Beca 100% que no recibió acceso

**Cuándo:** se entregó una beca (admitida con 100% de descuento) y el founder no recibió el correo con el acceso al portal.

**Desde 2026-07-17 (OP-2154) el flujo ya es correcto:** admitir con 100% activa a los founders y manda el correo de **onboarding** (con el link), no el de "pago recibido". Si un becado NUEVO no recibe acceso, es un problema del **template `onboarding` en Airtable** (revisar su contenido), no del código.

**Para becas VIEJAS que quedaron sin acceso** (dadas antes del fix): usar el Caso 3 (corregir acceso) o el script de fix.

---

## Caso 3 — Founder Inscrito/pagado pero sin acceso (inconsistencia)

**Cuándo:** la startup pagó / está Inscrita / becada, pero el founder no puede entrar o no le llegan sesiones. Suele venir de doble-suscripción, churn mal disparado, o becas viejas.

**Diagnóstico (read-only):** buscar al founder por email en Airtable (tabla Founders MF26) y revisar:
- `portal_access` del founder → si es `NO` pese a estar Inscrito/pagado, es el bug.
- Que el founder tenga **link a su startup** (campo `Startups MF26`). Si está vacío, hay que religarlo.
- Status de la startup (no debería ser `Churn` si pagó).

**Corrección:**
- **Preferido (cuando exista OP-2167):** vista admin de inconsistencias → botón "Reactivar acceso".
- **Mientras tanto:** script `scripts/fix-ciudata-acceso.ts` como plantilla — ajustar los record IDs. Corre **dry-run por defecto**; revisar la salida y luego correr con `--apply`.

**Siempre validar contra Airtable real después** (releer los records), no asumir. Regla del proyecto: validar con datos reales.

---

## Caso 4 — Founder que SÍ debe perder acceso (NO reactivar)

No reactivar si:
- **Churn por no-pago legítimo** (`payment_failed_at` presente y no va a pagar).
- **Money Back / reembolso** (`status="Money Back"`).
- **Baja voluntaria** que el founder pidió (`Churn By Founder`).

En estos casos el acceso apagado es correcto.

---

## Scripts de diagnóstico útiles (repo, read-only salvo se indique)

- `scripts/check-founder.ts <recordId>` — inspecciona un record en las 3 tablas.
- `scripts/fix-ciudata-acceso.ts [--apply]` — plantilla de fix de acceso (dry-run por defecto).
- `scripts/fix-portal-access-huerfanos.ts` — founders con `portal_access=true` cuyo status NO otorga acceso (limpieza inversa).

> Todos leen credenciales de `.env.local` (`AIRTABLE_PAT`, `AIRTABLE_BASE_ID`). Correr con `npx tsx scripts/<archivo>.ts` desde la raíz del repo.

---

## Referencias

- Plan de origen: `docs/planes/2026-07-17-dados-de-baja-beca-ciudata-acceso.md`
- Auditoría de suscripciones (doble-sub): `docs/planes/2026-07-06-auditoria-suscripciones-mf26.md`
- Reconciliación calendario ↔ acceso: `docs/planes/2026-07-09-reconciliacion-acceso-calendario.md`
- Issues: OP-2153 (reactivar), OP-2154 (beca), OP-2155 (Ciudata), OP-2167 (vista inconsistencias).
