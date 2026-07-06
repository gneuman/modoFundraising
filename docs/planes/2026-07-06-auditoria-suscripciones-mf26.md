---
titulo: Auditoría total de suscripciones MF26
fecha: 2026-07-06
proyecto: Modo Fundraising 2026
estado: en-progreso
tipo: auditoria
tags: [suscripciones, stripe, cobranza, airtable, WI-1823]
---

## Objetivo

La cliente reportó "no aparece el botón de cancelar suscripción". La investigación reveló que era la punta del iceberg. Se auditaron los **41 founders inscritos** cruzando Airtable (Postulaciones + Pagos) contra Stripe **production**. Resultado: **25 de 41 con alguna anomalía**, incluyendo **4 morosos con cobro atrasado sin ejecutar** y **1 doble cobro**.

## Lo que se hizo

1. **Auditoría read-only** de los 41 inscritos (Airtable ↔ Stripe).
2. **Panel admin `/admin/suscripciones`** que reproduce esta auditoría en vivo (sensor permanente).
3. **Correo de pago** mejorado: progreso de cuotas + banner anti-doble-pago.

Las **acciones operativas** (cancelar subs, reembolsos, cobros) quedan documentadas aquí para que la cliente decida — **no se ejecutaron**.

---

## Requieren decisión de la cliente (casos críticos)

### 🔴 1. Ciudata (camila@ciudata.io) — DOBLE suscripción activa
Dos subs creadas el mismo día 16-jun, ambas `active`:
- `sub_1TilPO` (01:03) → factura $349.00 (sin cupón)
- `sub_1Tj3EZ` (20:05) → factura $279.20 (con 20% off)

Inició el checkout dos veces. La cuota 2 le cobrará **$628/mes**.
**Acción sugerida:** cancelar `sub_1TilPO` ($349) en Stripe + reembolsar los $349 de esa factura. Dejar viva `sub_1Tj3EZ` ($279.20).

### 🔴 2. Cuatro morosos (`past_due`) — cobro atrasado NO ejecutado
Todos con **tarjeta válida guardada** (se les puede cobrar):

| Startup | Email | Plan | Pagadas | Sub morosa |
|---|---|---|---|---|
| Maity | direccion@maity.cloud | 4 | 2 | `sub_1TNCh9` |
| Kawesqar | kawesqar.travel@gmail.com | 4 | 2 | `sub_1TNCd0` |
| PIXLAB | xavier@pixdea.com | 4 | 2 | `sub_1TNbjb` |
| AdmiralONE | jcamus@admiralone.cl | 3 | 1 | `sub_1TSdxQ` (+ tiene otra `active` `sub_1TomE1` — revisar posible duplicado) |

**Causa raíz:** la factura se emitió con `collection_method = send_invoice`, `attempt_count = 0`, sin `next_payment_attempt`. **Stripe emitió la factura pero nunca intentó cobrar la tarjeta.** El founder tampoco pagó desde el link → la sub cayó a `past_due`.
**Acción sugerida:** cobrar la factura pendiente con la tarjeta guardada (lo hace el cron `sub-health` o manualmente en Stripe). Ver sección "Causa sistémica".

### 🟡 3. majo (majo@tophunting.ai) — "pagó" en Airtable, no existe en Stripe
Airtable marca "Cuota 1 pagada" pero **no hay customer en Stripe** ni pago registrado.
**Acción sugerida:** confirmar si fue pago externo (transferencia) o un error de estado. Si no pagó, corregir el status.

---

## Causa sistémica: los crons de cobranza no corren solos

**No existe `vercel.json` con bloque `crons`.** Los endpoints existen pero nadie los dispara automáticamente:
- `/api/cron/sub-health` — cobra facturas `open` vencidas con la tarjeta default y detecta sobre-cobros.
- `/api/cron/cobranza` — recordatorios de pago fallido.

Por eso los 4 morosos se acumulan sin gestión. **Recomendación:** agendar `sub-health` (diario) y `cobranza`, ya sea vía `vercel.json` o vía el n8n existente (`docs/n8n/`). Es una decisión de infraestructura de la cliente.

---

## `total_cuotas` vacío — 13 subs (riesgo de cancelación temprana)

El código usa `total_cuotas` de la **Postulación** con fallback `?? 3`. Está **vacío en 13 subs activas** → el sistema asume 3 cuotas. Para founders con plan de **4 cuotas** (Maity, Kawesqar, PIXLAB, Antü, Finsphera ya lo tienen bien puesto), si `total_cuotas` quedara vacío el sistema los cancelaría en la cuota 3 → **se pierde una cuota de ingreso** y el correo de progreso diría mal el total.

**Nota:** el campo "Cuantas Cuotas" de la tabla **Pagos** está huérfano (el código no lo lee). Lo que importa es `total_cuotas` en **Postulaciones**.
**Acción sugerida:** llenar `total_cuotas` en las 13 postulaciones con subs activas según el plan real acordado.

---

## Tabla completa (41 inscritos)

Leyenda flags: 🔴 DOBLE_SUB / MOROSA / SIN_STRIPE · 🟠 FACTURA_OPEN · 🟡 SIN_SUB_ACTIVA / TOTAL_CUOTAS_VACIO · ✅ OK

| Startup | Estado pago | Plan | Pagadas | Subs act. | Tarjeta | Flags |
|---|---|---|---|---|---|---|
| Ciudata (camila) | Cuota 1 | 3* | 2 | **2** | sí | 🔴 DOBLE_SUB, TOTAL_CUOTAS_VACIO |
| Maity (direccion) | Cuota 2 | 4 | 2 | 0 | sí | 🔴 MOROSA (past_due) |
| Kawesqar | Cuota 2 | 4 | 2 | 0 | sí | 🔴 MOROSA (past_due) |
| PIXLAB (xavier) | Cuota 2 | 4 | 2 | 0 | sí | 🔴 MOROSA (past_due) |
| AdmiralONE (jcamus) | Cuota 1 | 3* | 1 | 1 | sí | 🔴 MOROSA, TOTAL_CUOTAS_VACIO |
| majo | Cuota 1 | 3* | 0 | 0 | no | 🔴 SIN_STRIPE |
| Antü (manuel.mata) | Cuota 2 | 4 | 2 | 1 | sí | 🟠 FACTURA_OPEN |
| eepadilla | Cuota 3 | 3* | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| guidofalaq | Cuota 3 | 3* | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| ibarutta (LEAF) | Cuota 1 | 1 | 1 | 0 | sí | 🟡 SIN_SUB_ACTIVA |
| leonardo (Zeii) | Cuota 1 | 1 | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| lnaranjo (AEON) | Cuota 1 | 3* | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA, TOTAL_CUOTAS_VACIO |
| patricio (Aventia) | Cuota 1 | 1 | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| paz (Zavia) | Cuota 3 | 1 | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| simeon | Cuota 3 | 3* | 1 | 0 | no | 🟡 SIN_SUB_ACTIVA |
| admin (HotelREVENUE) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| cristian (WiseMed) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| dante (Kontrolia) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| francisco (Fintezia) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| gilles (BinkBe) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| guillermo (Identity Rules) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| javier (Hidrogenios) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| manuel (Aindez) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| miguelberretta (MicroIN) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| sergio (Solyon) | Cuota 1 | 3* | 1 | 1 | sí | 🟡 TOTAL_CUOTAS_VACIO |
| adrian (Finsphera) | Cuota 3 | 4 | 3 | 1 | sí | ✅ OK |
| + 15 becas 100% / pendiente | — | — | 0 | 0 | — | ✅ OK |

*Plan = "3*" significa `total_cuotas` vacío → el sistema asume 3.

---

## MAA

- **Medir:** # founders con estado de suscripción correcto (sin doble cobro, sin morosidad no gestionada, `total_cuotas` correcto). **Base hoy (2026-07-06): 25/41 con anomalía, 4 morosos, 1 doble cobro.**
- **Analizar:** el panel `/admin/suscripciones` es el sensor que antes no existía; permite comparar semana a semana.
- **Actuar:** panel + correo mejorado + recomendación de agendar crons. **Meta: 0 anomalías sin resolver.**

## Verificación pendiente

- [ ] Cliente confirma acción para Ciudata (cancelar + reembolsar).
- [ ] Decisión sobre agendar crons de cobranza (`sub-health` / `cobranza`).
- [ ] Llenar `total_cuotas` en las 13 postulaciones con sub activa.
- [ ] Confirmar caso majo (pago externo vs error).
- [ ] Panel validado en prod contra Stripe (smoke test: Ciudata sale en rojo, 4 morosos aparecen).
