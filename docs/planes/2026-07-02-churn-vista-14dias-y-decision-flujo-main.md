---
titulo: Vista Churn + baja automática + encuesta razones + decisión de flujo directo a main
fecha: 2026-07-02
proyecto: modoFundraising
estado: completado
tipo: feature
tags: [churn, admin, portal, refactor, ops, staging]
---

## Objetivo

Cerrar el issue de Churn del 3 de julio: vista `/admin/churn` con lista de founders que se dieron de baja, ventana de 14 días para reembolso, dar de baja a founders (incluyendo Calendar), encuesta consolidada de razones.

## Lo que se hizo

### 4 tickets mergeados a main el 2026-07-02

- **WI-1653** `fix(portal): cancel manual saca founders de Calendar` — [PR #17](https://github.com/gneuman/modoFundraising/pull/17). Cuando un founder cancelaba desde `/portal/suscripcion`, quedaba invitado en Google Calendar. Ahora el flujo obtiene los emails ANTES de desactivar y llama `removeAttendeeFromAllEvents` sobre TODOS los eventos (no solo S1/S2).
- **WI-1654** `refactor(portal): elimina churn-form duplicado` — [PR #18](https://github.com/gneuman/modoFundraising/pull/18). Existían 2 flujos paralelos de captura de motivo: `/portal/suscripcion` (tabla `Rechazos MF26`) y `/portal/sin-acceso/churn-form` (campo `churn_reason`). Eliminamos el segundo; la fuente única de motivos es `Rechazos MF26`.
- **WI-1655** `feat(admin/churn): vista /admin/churn con lista + ventana 14 días` — [PR #20](https://github.com/gneuman/modoFundraising/pull/20). Nueva ruta con KPIs (total, en ventana, motivo dominante, monto en riesgo), tabla completa, filtros por estado y motivo. La ventana de 14 días se cuenta desde el **martes 24-jun-2026** (inicio del programa); vence el **8-jul-2026**.
- **WI-1656** `feat(admin/churn): botón Reembolsar dentro de 14 días` — [PR #21](https://github.com/gneuman/modoFundraising/pull/21). Endpoint `POST /api/admin/refund` que reembolsa todos los charges pendientes de un email. UI con confirmación inline. Solo aparece si `amountRefundable > 0` (ya filtrado por ventana desde el server).

### Decisión de flujo: merge directo a main

Modo Fundraising no tiene staging environment aislado. Preview URLs de Vercel comparten Airtable prod + Stripe live + Google Calendar real. Decisión de Gabriel: **por ahora seguimos mergeando directo a main con validación humana entre cada merge**, hasta que se implemente staging.

Deuda técnica creada: **WI-1660** `tech-debt: setup preview env con Airtable staging + Stripe test + Calendar staging`. Prioridad Media, sin due date.

**Para proyectos NUEVOS de GNB:** el skill global `setup-gnb-project` ahora tiene un Paso 7.6 dedicado a configurar staging desde el arranque + una referencia completa en `references/preview-env.md`. Esto es para que Modo Fundraising sea el último proyecto GNB que sale a prod sin staging.

## Archivos creados/modificados

Repo `modoFundraising`:

- `src/app/api/stripe/cancel/route.ts` — WI-1653 (fix Calendar).
- `src/app/portal/sin-acceso/{churn-form.tsx,actions.ts}` — WI-1654 (eliminados).
- `src/app/portal/sin-acceso/page.tsx` — WI-1654 (mensaje simplificado).
- `src/lib/airtable.ts` — WI-1655 (`RechazoRecord` + `listRechazos()`).
- `src/app/admin/churn/{page.tsx,churn-filters.tsx,refund-button.tsx}` — WI-1655 + WI-1656.
- `src/app/api/admin/refund/route.ts` — WI-1656.
- `src/components/admin/sidebar.tsx` — WI-1655 (link "Churn").

Skill global (`~/.claude/skills/setup-gnb-project/`):

- `SKILL.md` — agrega Paso 7.6 "Preview environment aislado (staging desde el arranque)" + regla en Reglas.
- `references/preview-env.md` — guía completa (Airtable, Stripe, Calendar, Vercel env vars, checklist verificación).

Memoria del proyecto (`~/.claude/projects/.../memory/`):

- `flujo-merge-directo-a-main.md` — feedback memory con la decisión.
- `MEMORY.md` — entrada indexada.

## Verificación pendiente (Done requiere validación humana)

Los PRs están mergeados y Vercel deployó, pero ninguno pasa a Done hasta validación en producción:

1. **WI-1653** — hacer un cancel de prueba con founder de test. Verificar en Google Calendar que el email desapareció de todas las clases (pasadas y futuras).
2. **WI-1654** — entrar como usuario con status `Churn By Founder` a `/portal/sin-acceso`. Verificar que sale el mensaje simple sin formulario roto ni import faltante.
3. **WI-1655** — abrir `/admin/churn`. Verificar KPIs, filtros y tabla contra los founders en Churn actuales.
4. **WI-1656** — hacer un reembolso de prueba a un founder en ventana 14d (o crear uno de test). Confirmar en Stripe dashboard que el refund aparece.

## MAA

- **Medir:** número de churns en ventana 14d que se reembolsan efectivamente vs quedan sin refund. Distribución de motivos.
- **Analizar:** si "precio" >50% del churn → problema de pricing/comunicación; si "no era lo que esperaba" es alto → problema de posicionamiento.
- **Actuar:** ajustar copy o precio de la próxima cohorte según el motivo dominante. Habilitar tracking semanal desde `/admin/churn` KPIs.

## Nota sobre proceso paralelo en el repo

Durante el trabajo (~20:00 UTC) se detectó que otro proceso (posiblemente otra sesión de Claude o un hook) estaba haciendo checkouts y commits automáticos en el repo, cambiando de rama y modificando `src/lib/airtable.ts`. Los cambios de este ticket están intactos en sus respectivas ramas remotas — se resolvió trabajando en ramas dedicadas por commit y verificando `git branch --show-current` antes de cada commit. Vale la pena investigar el origen para futuros trabajos.
