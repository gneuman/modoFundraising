---
titulo: Reset de local paralelo + normalización de email en Modo Fundraising
fecha: 2026-06-29
proyecto: impactaVC / Modo Fundraising
estado: completado
tipo: fix + ops-git
tags: [git, auth, email, modo-fundraising, divergencia, normalizacion]
---

# Reset de local paralelo + normalización de email en Modo Fundraising

## Objetivo

Aplicar normalización de email (`David.Alvo === david.alvo`) en todo el flujo de
login del portal de Modo Fundraising 2026, y resolver la divergencia del repo
local que tenía 5 commits sobre una historia paralela sin ancestro común con
`origin/main`.

## MAA

- **Medir**: # de tickets/quejas de founders que no pueden hacer login por casing.
  Hasta hoy el flujo era inconsistente (esAdmin normalizaba, pero los `find` por
  email no). Métrica de seguimiento: 0 fallas reportadas de login por casing.
- **Analizar**: el remoto ya había añadido normalización en `esAdmin` y
  `magic/route.ts`, pero quedaban 4 `apps.find((a) => a.email === ...)`
  case-sensitive y `getFounderByEmail` / `getApplicationByEmail` con filtros
  Airtable case-sensitive. Cualquier email cargado en Airtable con casing
  inusual (mayúsculas, espacios) seguía rompiendo el flujo en silencio.
- **Actuar**: exportar `normalizarEmail()` desde `lib/auth.ts`, normalizar en
  los JWT, en las queries de Airtable (`LOWER()`) y en las comparaciones
  con `session.email`.

## Lo que se hizo

### Paso 1: Diagnóstico de divergencia

El repo `Modo Fundraing/app` (interno de impactaVC) tenía:

- 5 commits locales del 23 abril (+ uno de hoy con normalización inicial)
- 200+ commits en `origin/main` (https://github.com/gneuman/modoFundraising.git)
- **Ninguna base común** (`git merge-base HEAD origin/main` → exit 1)

Los commits del 23 de abril son una historia paralela obsoleta. El remoto está
mucho más al día (onboarding masivo, calendar, mobile-first, magic link 72h,
~35 scripts).

### Paso 2: Respaldo

- 5 commits exportados como `.patch` en
  `cerebro/modo-fundraising-patches-2026-06-29/` (con README).
- Branch `local-paralelo` creado apuntando al HEAD original.

### Paso 3: Reset

`git reset --hard origin/main` → `main` ahora apunta a `19582c9`.

### Paso 4: Re-aplicación adaptada

Commit `1f5327c` sobre `origin/main` con:

- `lib/auth.ts`: exporta `normalizarEmail()`; `crearTokenMagic` y
  `verificarTokenMagic` y `decodificarEmailToken` normalizan email.
- `lib/airtable.ts`: `getFounderByEmail`, `getFounderProfile`,
  `registrarIngresoPortal`, `getApplicationByEmail` usan `LOWER({email})` en
  filterByFormula.
- `app/api/apply/route.ts`: `data.email` normalizado antes del check de
  duplicados y antes de guardar.
- `app/api/equipo/invitar/route.ts`: normaliza `email` del nuevo founder y
  `session.email` en el `find`.
- `app/api/stripe/cancel/route.ts`, `app/api/stripe/portal-checkout/route.ts`,
  `app/api/admin/coupons/route.ts`: los `apps.find(...)` normalizan ambos lados.

## Archivos modificados

En `Modo Fundraing/app/`:

- `src/lib/auth.ts`
- `src/lib/airtable.ts`
- `src/app/api/apply/route.ts`
- `src/app/api/equipo/invitar/route.ts`
- `src/app/api/stripe/cancel/route.ts`
- `src/app/api/stripe/portal-checkout/route.ts`
- `src/app/api/admin/coupons/route.ts`

Diff total: 7 archivos, +36 / -20.

## Verificación pendiente

- [ ] Hacer push a `origin/main` cuando confirmes que está OK.
- [ ] Probar login con `David.Alvo@x.com` vs `david.alvo@x.com` en staging.
- [ ] Decidir si normalizar también los emails ya guardados en Airtable (one-time
  migration script para que el dato persistido sea consistente).
- [ ] Revisar si `0002-Landing-Nueva.patch` (assets IFSP) o `0004-Solo-Modo-Funraising.patch`
  tienen algo que re-aplicar al remoto (cerebro/modo-fundraising-patches-2026-06-29/).

## Red de seguridad

- Branch `local-paralelo` en el repo local conserva los 5 commits originales.
- Patches `.patch` en `cerebro/modo-fundraising-patches-2026-06-29/`.
- Commit `a7e9f05` (versión original del fix sobre local paralelo) está en
  `local-paralelo` y en patch `0005`.
