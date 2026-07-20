---
titulo: Operación del portal + cambios a discutir (automatizaciones, churn, misiones, visibilidad, calendario)
fecha: 2026-07-20
proyecto: modoFundraising
estado: en-discusion
tipo: guia-operativa + analisis-decisiones
tags: [automatizaciones, email, slack, churn, misiones, calendario, admin, sop]
---

# Objetivo

Responder 7 preguntas operativas del portal y, para las que implican un cambio de
comportamiento, explicar **de qué se tratan** para poder decidir antes de tocar
código. Este documento **no modifica el sistema** — es guía + análisis para decisión.

Las 7 preguntas se separan en dos grupos:

- **Parte 1 — Ya se puede hoy sin código.** SOP con rutas y clics exactos.
- **Parte 2 — Cambios a discutir.** Qué son, opciones y recomendación (B1–B4).

Arquitectura de fondo (para contexto): **no hay base SQL** — el modelo de datos vive
en **Airtable** (`src/lib/airtable.ts`). Los correos salen por **Gmail API**
(`src/lib/email-engine.ts`), no por Resend/SES. Los **crons los dispara n8n** por HTTP
con `Authorization: Bearer <CRON_SECRET>` (no hay `vercel.json`). **Slack no se postea
desde el repo**: el código arma el texto y lo devuelve en el JSON para que n8n lo rutee.

---

# PARTE 1 — Lo que YA puedes hacer sin código

## 1.1 Editar y crear automatizaciones por mail y Slack

**Ruta admin:** `/admin/comunicaciones`
(`src/app/admin/comunicaciones/page.tsx` → `src/components/admin/comunicaciones-manager.tsx`)

Desde ahí puedes, sin tocar código:

- **Editar el texto de un correo** (templates con variables `{{first_name}}`, etc.).
- **Activar/desactivar qué se envía ante cada evento** (reglas por `trigger_event`).
- **Ajustar el retraso** (`delay_hours`) de un envío.
- **Probar un envío** antes de activarlo (botón de prueba →
  `src/app/api/admin/comunicaciones/templates/test-send/route.ts`).

**Cómo funciona por dentro** (para entender qué estás tocando):
- El motor es `sendAutomationEmail()` en `src/lib/email-engine.ts:406`. Busca las
  reglas activas por `trigger`, renderiza el template, aplica condición y delay, y envía.
- Las reglas y templates viven en Airtable (tablas `AUTOMATION_RULES` y
  `EMAIL_TEMPLATES`). CRUD en `src/lib/airtable.ts:2806-2891`.
- Los 16 eventos válidos están en el enum `TriggerEvent`
  (`src/lib/airtable.ts:2766`).

**Qué NO se edita desde el admin (ojo):**
- **La frecuencia/horario de los crons** (cobranza, follow-up, avisos de clase) se
  configura en **n8n**, no en el repo. Referencia del workflow:
  `docs/n8n/modo-fundraising-notificaciones.json` y el plan
  `docs/planes/2026-06-03-activar-crons-n8n.md`.
- **El ruteo de Slack**: el código solo arma el texto (ej.
  `src/app/api/airtable/mision-activada/route.ts:49`, `buildSlackText()`) y lo devuelve
  en el JSON de respuesta. **n8n lo postea** al canal. Para cambiar el canal o formato
  del post de Slack, se toca en n8n; para cambiar el *copy* del mensaje de misión, se
  toca ese archivo (eso sí es código).

**Crear una automatización con un trigger NUEVO** (sí requiere código, breve):
1. Agregar el valor al enum `TriggerEvent` (`src/lib/airtable.ts:2766`).
2. Crear una función wrapper en `email-engine.ts` que llame
   `sendAutomationEmail("nuevo_trigger", ...)`.
3. Llamarla desde el trigger real (webhook/cron/Stripe).
4. Crear template + regla desde `/admin/comunicaciones`.

> Crear una regla sobre un evento **ya existente** = 100% admin, sin código.

## 1.2 Ver las respuestas de la encuesta de churn

**Ruta admin:** `/admin/churn` (título en la UI: **"Dados de baja"**)
(`src/app/admin/churn/page.tsx`)

Ahí ves cada baja con:
- **Motivo** (`reasonLabel`) y **detalle** libre (`detail`).
- **Tipo de baja**: no_pago / voluntaria / manual.
- **Ventana de reembolso** (14 días) y montos (cruza pagos de Stripe).
- **Motivo dominante** del cohort (agregado).

**Por dentro:** las respuestas se guardan en la tabla `RECHAZOS` de Airtable vía
`createRechazoRecord()` (`src/lib/airtable.ts:2926`) en el momento de la baja. El admin
las lee con `listRechazos()` (`src/lib/airtable.ts:2953`).

## 1.3 Subir / activar / desactivar misiones

**Ruta admin:** `/admin/misiones`
(`src/app/admin/misiones/page.tsx` → `src/components/admin/misiones-manager.tsx`)

El campo que controla todo es **`status`**, con 4 valores:
`Próxima → Activa → Actual → Cerrada`.

- **Subir una misión nueva:** crearla desde el admin. Nace en `Próxima` (no visible/no
  notifica).
- **Activarla:** cambiar `status` a **`Activa`**. Esto dispara (vía Automation de
  Airtable → webhook `src/app/api/airtable/mision-activada/route.ts`) un **correo masivo
  a todo el cohort** con acceso, y luego la misión pasa **sola** a `Actual` si el envío
  fue 100% exitoso.
- **Desactivar / ocultar:** cambiar `status` a **`Cerrada`** (o de vuelta a `Próxima`).
- **Re-enviar el correo de una misión:** vaciar el campo `notif_enviada_at` en Airtable
  (es el candado de idempotencia). Hay script `scripts/reenviar-mision-fallidos.ts` para
  reintentar a los que fallaron.

> ⚠️ **Importante:** poner una misión en `Activa` = **se dispara correo a todo el
> cohort**. Ese es el momento que hoy controlas manualmente. Relevante para B4 (abajo).

## 1.4 Re-agregar sesiones al calendario a founders eliminados

**El campo que manda es `portal_access = 1`** en la tabla `Founders` de Airtable.
Todo el sistema de calendario invita a quien tenga ese flag y saca a quien lo pierda.

**Qué ya funciona solo:** el **cron diario `sync-attendees`**
(`src/app/api/cron/sync-attendees/route.ts`) toma a **todos** los founders con
`portal_access=1` y los re-agrega a **todas las clases futuras** que les falten. Es la
red de seguridad: cualquier founder reactivado queda re-invitado a todo **al día
siguiente**, sin intervención.

**Cómo forzarlo sin esperar al cron** (si un founder quedó fuera y lo necesitas ya):
- Correr el cron manualmente: `POST /api/cron/sync-attendees` con el header
  `Authorization: Bearer <CRON_SECRET>`. Acepta `{ "dryRun": true }` para simular.
- O usar scripts en `scripts/` (ej. `invitar-todos-eventos.ts`).

**Matiz que conecta con B1:** cuando reactivas desde `/admin/churn` ("Reactivar sin
cobro"), la invitación **inmediata** solo cubre **S1 y S2**
(`inviteStartupToCalendar` usa `getFutureCalendarEventIds()`, que filtra prefijo S1/S2 —
`src/lib/airtable.ts:645`). El resto de clases llega con el cron diario. Ver B1.

## 1.5 Revisión del flujo de dar de baja (#6)

**Flujo real, punta a punta:**

1. El founder abre el modal de baja en `/portal/suscripcion`
   (`src/app/portal/suscripcion/suscripcion-client.tsx`), elige un motivo (6 opciones) y,
   si es "otro", escribe el detalle.
2. `handleCancel()` hace `POST /api/stripe/cancel` con `{ reasonCode, detail }`.
3. El backend (`src/app/api/stripe/cancel/route.ts`):
   - Resuelve la suscripción (ID guardado, o la busca en Stripe por customer).
   - **Cancela la suscripción en Stripe** (si es de cuotas; el pago único no tiene qué
     cancelar).
   - En paralelo: status postulación → `Churn By Founder` + `portal_access:false`;
     desactiva todos los founders; startup → `Churn`; **crea el registro de encuesta**
     (`createRechazoRecord`).
   - **Saca a los founders de TODOS los eventos** de Calendar.
   - Manda `sendChurnEmail`.

**Hallazgos de la revisión** (no son bugs críticos, pero conviene anotarlos):

- **H1 — La encuesta va dentro del `Promise.all` crítico**
  (`cancel/route.ts:78-91`). Si `createRechazoRecord` falla, todo el bloque rechaza y el
  founder puede quedar a medio-churnear. La encuesta debería registrarse aunque el resto
  del churn se complete (idealmente fuera del `Promise.all` o con `Promise.allSettled`).
- **H2 — `sendChurnEmail` sin try/catch** (`cancel/route.ts:107`). Si el correo falla, el
  endpoint devuelve error aunque el churn **ya se ejecutó**. El usuario ve error pero sí
  quedó dado de baja → confusión / doble intento. Debería ir en try/catch como el bloque
  de calendario (que sí lo tiene, L96-104).
- **H3 — Consistencia de motivos.** Los 6 motivos viven duplicados en 3 lugares
  (`suscripcion-client.tsx`, `airtable.ts:2899`, `cancel/route.ts:18`). No es bug hoy,
  pero es la razón por la que B3 toca 3 archivos.

> Ninguno bloquea la operación actual. H1 y H2 son mejoras de robustez que se pueden
> convertir en un issue de "endurecer flujo de baja" si quieres.

---

# PARTE 2 — Cambios a discutir (qué son, para decidir)

> Ninguno implementado. Aquí está el análisis para que decidas cada uno.
> Cuando apruebes uno, se convierte en **1 issue Linear = 1 branch = 1 PR**.

## B1 — Reactivación al calendario: ¿S1/S2 o todas las clases?

**De qué se trata:** al reactivar un founder de churn (`/admin/churn` → "Reactivar sin
cobro"), la invitación **inmediata** solo lo mete a **S1 y S2**. Las demás clases
futuras llegan con el cron diario `sync-attendees` (T+1 día).

- **Archivo:** `inviteStartupToCalendar` en
  `src/app/api/admin/applications/route.ts:10-23` usa `getFutureCalendarEventIds()`
  (solo S1/S2). El cron usa `getUpcomingClaseEventIds()` (todas).
- **Cambio propuesto:** que la reactivación use también `getUpcomingClaseEventIds()` →
  re-invita a **todas las clases futuras al instante**, sin esperar al cron.
- **Riesgo:** bajo, acotado. Reutiliza una función que ya existe y ya usa el cron.
- **Recomendación:** implementarlo. Resuelve tu pregunta #5 de raíz.
- **Estado:** documentado. **Pendiente tu OK** para crear el PR.

## B2 — Ocultar elementos del portal (admin y founders)

**De qué se trata:** cómo se controla la visibilidad de secciones/tabs/cards. **No hay
feature flags ni variables de entorno** — se controla editando arrays de navegación.

**Admin** (`src/components/admin/sidebar.tsx:27-53`): el menú es un array `NAV`. Ocultar
un item = **comentar su línea**. La página sigue viva y accesible por URL directa (no se
borra nada). Precedente real: commit `b254205` ocultó "Suscripciones" así:
```js
// { href: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
```

**Founders** (`src/components/portal/sidebar.tsx:30-38`): dos mecanismos:
1. `hidden: true` en el item → siempre oculto.
2. Oculto según datos: el layout (`src/app/portal/layout.tsx:25-30`) calcula flags
   (`showClases`, `showMisiones`, `showRecursos`) desde Airtable y las pasa como props.
   También existe `locked` (candado + blur cuando el founder no pagó).

**Elementos que existen hoy** (para que elijas qué ocultar):
- *Admin:* postulaciones, revenue, comunicaciones, misiones, misiones-atrasadas, churn,
  calendario, inconsistencias, (suscripciones ya oculto), etc. — ver el array `NAV`.
- *Founders:* clases, misiones, recursos, mi startup, suscripción — ver `NAV` del portal.

- **Recomendación:** decidir **qué** elemento(s) ocultar (tú los defines), y lo aplico.
  El mecanismo es trivial una vez sepamos cuáles.
- **Estado:** **a discutir cuál(es)**.

## B3 — Modificar la encuesta de churn

**De qué se trata:** los motivos, textos y campos del formulario de baja.

**Motivos actuales (6):** `precio`, `tiempo`, `prioridades`, `ronda_levantada`,
`no_esperado`, `otro`. Etiquetas en `CHURN_REASON_LABELS`
(`src/lib/airtable.ts:2907`).

**Para cambiar motivos/textos**, hay que mantener **3 archivos consistentes** (por eso
no es un cambio de un solo lugar):
1. `src/app/portal/suscripcion/suscripcion-client.tsx` — el UI (`ReasonCode` + `REASONS`
   con emojis).
2. `src/lib/airtable.ts:2899` — `ChurnReasonCode` + `CHURN_REASON_LABELS`.
3. `src/app/api/stripe/cancel/route.ts:18` — `VALID_REASONS` (validación).

**Opciones típicas:** agregar/quitar un motivo, cambiar textos, o agregar un campo nuevo
(ej. "¿volverías?"). Cada uno tiene alcance distinto.

- **Recomendación:** definir el cambio exacto; entonces estimo alcance (agregar motivo =
  3 archivos; agregar campo con guardado = además tocar `createRechazoRecord` y la vista
  admin).
- **Estado:** **a discutir el cambio**.

## B4 — Activación / desactivación automática de misiones

**De qué se trata:** hoy la activación es **manual** (tú cambias `status` a `Activa`).
"Automática" significaría que un cron lo haga por fecha (`dias_offset` / `fecha_limite`).

**El riesgo clave:** activar una misión **dispara un correo masivo a todo el cohort**
(webhook `mision-activada`). Si un cron activa por fecha, **ese correo sale sin que nadie
lo revise**. Hoy tú controlas ese momento a propósito.

**Tres opciones:**
1. **Activar por fecha (cron completo):** máxima automatización, pero manda correos
   masivos sin revisión humana. Mayor riesgo.
2. **Solo auto-cerrar vencidas:** mantiene activación manual (tú decides cuándo sale el
   correo), pero cierra solas las misiones que pasaron su `fecha_limite`. **Bajo riesgo —
   no manda correos.**
3. **Dejar manual:** solo documentar (ya cubierto en 1.3).

- **Recomendación:** empezar con **opción 2 (auto-cerrar)** — resuelve el desorden de
  misiones vencidas sin el riesgo del correo automático. La auto-activación (opción 1) se
  puede hacer después con un paso de confirmación (ej. cron que marca "lista para enviar"
  y tú das un clic).
- **Estado:** **a discutir la regla de negocio.**

---

# Método MAA

- **Medir:**
  - B1: % de founders reactivados que quedan en todas las clases futuras el mismo día
    (hoy solo S1/S2 al instante; meta 100% inmediato).
  - B4: # de intervenciones manuales para cerrar misiones vencidas por cohorte.
  - Churn (#6/H1-H2): % de bajas que registran encuesta correctamente vs. errores de
    endpoint.
- **Analizar:** contra el comportamiento actual (cron T+1 vs. inmediato; cierre manual
  vs. auto).
- **Actuar:** los PRs B1–B4 + endurecimiento del flujo de baja (H1/H2), una vez aprobados.

---

# Próximos pasos (pendientes de tu decisión)

1. **B1** — dar OK para crear PR (reactivación → todas las clases). *Recomendado.*
2. **B2** — decidir qué elemento(s) ocultar del admin y/o founders.
3. **B3** — definir el cambio exacto a la encuesta.
4. **B4** — elegir opción 1/2/3 para misiones automáticas.
5. **(Opcional)** — issue de robustez del flujo de baja (H1 + H2).

Cada uno aprobado = 1 issue Linear → branch `gneuman/<TEAM-ID>-<slug>` → PR.
