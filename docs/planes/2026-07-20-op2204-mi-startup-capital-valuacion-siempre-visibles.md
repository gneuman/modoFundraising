---
titulo: "OP-2204 — Mi startup: Capital a levantar + Valuación siempre visibles"
fecha: 2026-07-20
proyecto: Modo Fundraising 2026
estado: en-review
tipo: fix
tags: [portal, founders, fundraising, ux]
---

## Objetivo

En la vista `/portal/startup` ("Mi startup"), el founder reportaba que "Capital a levantar" y
"Valuación" no se veían aunque el display ya existía (OP-2162, mergeado).

## Causa raíz

`src/app/portal/startup/page.tsx` armaba las cards con `.filter((f) => f.value)`. Ese filtro
trata `0`, `undefined` y `""` como falsy, así que cualquier founder con `round_size = 0` o
`startup_valuation` sin capturar veía la card **desaparecer** por completo.

Verificado contra Airtable prod (98 startups): 49 con `round_size > 0`, 27 con
`startup_valuation > 0`. El resto (71 startups) no veía la card de valuación.

## Lo que se hizo

- Se separaron **Capital a levantar** (`round_size`) y **Valuación** (`startup_valuation`)
  del array filtrado. Ahora se muestran SIEMPRE en la vista del founder.
- Cuando falta el dato (0/undefined), la card muestra "Sin definir · Editar perfil" en vez
  de esconderse, invitando al founder a completarlo (botón "Editar perfil" ya está en el header).
- El resto de campos sigue escondiéndose si está vacío (`optionalFields`).

## Archivos modificados

- `src/app/portal/startup/page.tsx` — split de fields, render con placeholder.

## MAA

- **Medir:** % de founders que ven ambas cards (antes: solo >0; después: 100%).
- **Analizar:** 71/98 startups no veían valuación antes del fix.
- **Actuar:** el prompt "Sin definir" empuja a capturar el dato faltante.

## Verificación pendiente (validar en prod antes de Done)

1. Founder con round_size y valuation >0 → cards con montos correctos.
2. Founder con round_size=0 o sin valuation → cards visibles con "Sin definir".
3. Editar perfil → guardar → la card refleja el nuevo valor.
