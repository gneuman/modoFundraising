---
titulo: Link admin del día para misiones atrasadas (entrega tardía)
fecha: 2026-07-08
proyecto: Modo Fundraising 2026 — Web
estado: implementado (pendiente validación humana en prod)
tipo: feature
tags: [portal, misiones, admin, airtable, token, OP-1905]
---

## Objetivo

Permitir que founders atrasados contesten **todas** las misiones del programa
(no solo la Activa) mediante un **link firmado del día** que el equipo genera
desde `/admin`. Lo que el founder envía por ese link queda marcado como
**entrega tardía** en Airtable, para que el equipo distinga cumplimiento a
tiempo vs tardío.

## Decisiones (Gabriel, 2026-07-08)

- **Token por día**, firmado por el server (HMAC con `JWT_SECRET`). Cumple dos
  funciones: ventana de acceso (solo abre hoy) + marca de atrasado.
- **Link único por día** (sirve para cualquier founder; cada uno entra con SU
  sesión → guarda en su startup).
- **Generación desde panel admin** — el equipo copia "el link de hoy". Gabriel
  nunca genera tokens a mano.
- **Marca de atrasado en Consignas** (hay un record por startup+tarea) y también
  en Feedback (para tareas tipo encuesta).
- El comentario de la encuesta puede quedar vacío (no se manda nada).
- Calificación de la encuesta es 1–5 (el campo `rating` en Airtable es tipo
  rating, no acepta 0).

## Lo que se hizo

- **`src/lib/late-token.ts`** — `crearTokenDia()` / `verificarTokenDia()` +
  `hoyPrograma()` (fecha en `America/Santiago`). Token JWT con `{dia, scope}`,
  exp 36h; la validación real de "es de hoy" compara la fecha.
- **`src/app/portal/misiones/todas/page.tsx`** — vista que muestra TODAS las
  misiones (sin filtro de fecha). Valida `?t=`; sin token válido redirige a
  `/portal/misiones`. Banner de "entrega tardía".
- **`src/app/admin/misiones-atrasadas/page.tsx`** + `components/admin/link-atrasadas.tsx`
  — panel admin que muestra el link del día con botón copiar. Entrada en el
  sidebar admin ("Ponerse al día").
- **Forms** (`nps-form.tsx`, `entrega-form.tsx`) — mandan `t` (token de la URL)
  en el POST cuando está presente.
- **Backend** (`api/portal/consignas`, `api/portal/feedback`) — verifican el
  token y, si vale, escriben `atrasado = true` + `fecha_entrega_tardia`. Nunca
  desmarcan (enviar sin token no quita una marca previa).
- **`src/lib/airtable.ts`** — `upsertConsigna` y `createFeedback` aceptan
  `fechaTardia`; interfaces `ConsignaRecord`/`FeedbackRecord` con los campos.

## Airtable (campos creados por API)

- **Consignas MF26** (`tbliTlMl0dfbh3HWc`): `atrasado` [checkbox],
  `fecha_entrega_tardia` [date].
- **Feedback MF26** (`tblQCMVaKvzyfERct`): `atrasado` [checkbox],
  `fecha_entrega_tardia` [date].

## Verificación hecha (local, datos reales)

- Consigna con token de hoy → `atrasado=true` + fecha correcta en Airtable.
- Token viejo (2020) y sin token → no marcan; sin token no desmarca la previa.
- `/todas` sin token → 307 a `/portal/misiones`; con token → 200 con banner.
- Panel admin → 200, genera el link `/portal/misiones/todas?t=...`.
- Records de prueba borrados de la sandbox.

## Verificación pendiente (humana, en prod)

1. Admin abre `/admin/misiones-atrasadas` → ve el link del día.
2. Founder atrasado abre el link → ve todas las misiones, contesta una.
3. En Consignas/Feedback MF26: el record queda con `atrasado=true` + fecha.
4. Al día siguiente el link ya no abre (token caduca) → redirige a la normal.

## MAA

- **Medir:** # de founders atrasados que se ponen al día vía el link + #
  entregas marcadas tardías.
- **Analizar:** comparar tasa de completitud antes/después de habilitar el link.
- **Actuar:** si el uso tardío es alto, revisar si las ventanas de misión son
  demasiado cortas.
