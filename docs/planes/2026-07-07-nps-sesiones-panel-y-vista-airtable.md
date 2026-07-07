---
titulo: "NPS de sesiones: panel /admin/nps + vista en Airtable"
fecha: 2026-07-07
proyecto: modoFundraising
estado: parcial
tipo: mejora
tags: [nps, feedback, misiones, airtable, admin]
---

## Objetivo

Dar visibilidad al feedback (NPS + comentario) que los founders dejan sobre las
sesiones. El feedback **ya se captura** hoy, pero no había un lugar cómodo para
leerlo consolidado. Se agrega un panel en el admin y se documenta una vista en
Airtable.

## Diagnóstico: lo que YA existía (no se reconstruyó)

El NPS por sesión ya está implementado end-to-end:

- **Captura:** tarea de tipo `NPS` dentro de la misión activa. Escala 1-10 +
  comentario opcional por cada clase.
  [nps-form.tsx](../../src/components/portal/nps-form.tsx),
  [misiones/page.tsx:202](../../src/app/portal/misiones/page.tsx).
- **Guardado:** tabla **Feedback MF26** (`tblQCMVaKvzyfERct`). Campos: `rating`
  (1-10), `comentario`, `startup_record`, `clase_record`, `fecha`.
  `createFeedback()` en [airtable.ts:1778](../../src/lib/airtable.ts).
- **Cierre de misión:** una tarea NPS solo cuenta como "hecha" cuando la startup
  dejó feedback de TODAS las `clases_nps` de esa tarea
  ([airtable.ts:1745](../../src/lib/airtable.ts)).

Respuesta a la duda de Gabriel ("¿es tarea en la misión o siempre el NPS de la
semana anterior?"): **hoy es una tarea dentro de la misión**. Las `clases_nps`
se eligen a mano al armar la misión. No hay lógica automática de "semana
anterior" (se decidió no hardcodearla porque las clases van a cambiar).

## Lo que se hizo en este plan

### 1. Panel `/admin/nps` (código)
[src/app/admin/nps/page.tsx](../../src/app/admin/nps/page.tsx) — lee Feedback MF26
y las clases, y muestra:
- **Tarjetas:** NPS global (score -100 a +100), promedio /10, total de respuestas,
  total de comentarios.
- **Por clase (ordenado por semana desc):** NPS score, promedio, número de
  respuestas y la lista de comentarios (cada uno con su rating y color por
  promotor/pasivo/detractor).
- NPS score = %promotores(9-10) − %detractores(1-6).

Link agregado en el sidebar del admin junto a Churn
([sidebar.tsx](../../src/components/admin/sidebar.tsx)).

### 2. Vista en Airtable (instructivo manual — hacerlo en Airtable)
En la tabla **Feedback MF26**:
1. Crear una vista tipo **Grid** llamada "NPS por clase".
2. **Group by** → `clase_record`.
3. Activar el **summary bar**: en la columna `rating`, elegir *Average* (promedio
   por clase). En una columna cualquiera, *Count* (número de respuestas).
4. **Sort** dentro de cada grupo por `fecha` descendente.
5. Opcional: vista **Gallery** filtrada por `comentario` no vacío para leer solo
   los comentarios con texto.

> Nota: el NPS score (%promotores − %detractores) no se calcula nativo en el
> summary de Airtable; para eso está el panel `/admin/nps`. La vista de Airtable
> sirve para promedio + lectura de comentarios crudos.

## Archivos modificados/creados

- `src/app/admin/nps/page.tsx` (nuevo)
- `src/components/admin/sidebar.tsx` (link en nav)

## Pendiente / Fase 2 (NO hecho — requiere decisión)

- **Garantizar tarea NPS en cada misión:** hoy depende de que quien arma la
  misión agregue la tarea NPS con las `clases_nps` correctas. Si se quiere
  automatizar (que siempre traiga el NPS de la semana anterior), es lógica nueva
  de fechas/semanas — se pospuso porque las clases van a cambiar.
- **Bloque NPS fijo en el portal del founder:** mostrar siempre el feedback de la
  semana anterior, independiente de si la misión incluye la tarea. Cambio de
  código pendiente de definir bien el disparador.

## MAA — Medir / Analizar / Actuar

- **Medir:** NPS score global y por clase; ya existe el sensor (panel + tabla).
- **Analizar:** comparar NPS por semana/clase para detectar sesiones flojas. Base
  de comparación = histórico en Feedback MF26.
- **Actuar:** clase con NPS bajo → ajustar contenido/instructor. Revisar en el
  cierre semanal.

## Verificación

- [x] `tsc --noEmit` limpio en los archivos nuevos/modificados.
- [ ] Validación de Gabriel: abrir `/admin/nps`, confirmar que muestra el
      feedback existente agrupado por clase con NPS y comentarios.
- [ ] Crear la vista "NPS por clase" en Airtable siguiendo el instructivo.
