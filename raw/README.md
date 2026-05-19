# MF26 — Web handoff para Gabriel

Folder auto-contenido con la landing y 9 páginas internas de Modo Fundraising 2026.

## Estructura

```
MF26_web/
├── index.html              ← landing principal
├── advisory.html           ← Advisory 1:1 (verde)
├── cronograma.html         ← 13 semanas detallado
├── house-rules.html        ← cultura del cohort
├── live-interviews.html    ← grid de live interviews
├── masterclasses.html      ← grid de masterclasses
├── misiones.html           ← 7 misiones del programa
├── partners.html           ← redirect → rockstars.html#partners
├── qa.html                 ← Q&A completo
├── rockstars.html          ← Rockstars + Partners mergeado
├── styles.css              ← CSS global (~2600 líneas)
├── app.js                  ← JS global (countdown, carrusel testimonios, rotating word del recorrido, pricing toggle, FAQ accordion)
├── assets/                 ← logos auspiciadores (Oracle, +TODO)
│   └── logos/              ← logos partners
└── README.md               ← este archivo
```

## Deploy

Subir el folder completo a Vercel (reemplazando `modofundraising.vercel.app`). Sin build step. Sin dependencias externas (cero npm install).

Recomendaciones de configuración Vercel:

1. **URLs limpias** (`/cronograma` en vez de `/cronograma.html`)
   ```json
   // vercel.json
   {
     "cleanUrls": true,
     "trailingSlash": false
   }
   ```

2. **Redirect de partners**: ya hardcodeado en `partners.html` (meta refresh + JS replace). Si quieres redirect server-side:
   ```json
   { "source": "/partners", "destination": "/rockstars#partners", "permanent": true }
   ```

3. **SEO meta**: cada página tiene `<title>` y `<meta description>` específicos. Sumar Open Graph + Twitter Card si quieres link previews. Sitemap auto-generable con las 10 páginas.

## TODOs marcados en el HTML

Búscalo todo con `grep -rn "data-todo" .` y `grep -rn "TODO" .`. Listo lo crítico abajo.

### Conectar a Airtable (`data-todo="airtable-live"`)

Son ~20 puntos en el HTML. Estructura sugerida de tablas Airtable:

**`mf26_stats`** (1 record, polling cada N min)
- `capital_levantado` (number, M) → `+US$190M`
- `startups_count` (number) → `+100` / `+400`
- `inversionistas_count` (number) → `+200`
- `nps` (number) → `92`
- `capital_promedio` (number, M) → `US$1.9M`
- `paises_alumni` (number) → `12+`

**`mf26_casos`** (8+ records)
- `nombre` (Wild Foods, NutriCo, etc)
- `pais_emoji` (🇨🇱, 🇵🇪, 🇲🇽…) o `pais_iso` y armar emoji client-side
- `nombre_ronda` (pre-seed / seed / pre-Serie A / Serie A)
- `monto_ronda` (number) + `monto_format` (US$X.XM o US$X.XK)
- `invertida_por_impacta` (single select: "Portfolio Fund I" / "Invertida por David" / "Portfolio · descubierta en programa" / "Alumni IMSP" / null)
- `mostrar_en_strip` (checkbox)
- `mostrar_en_casos_detallados` (checkbox)
- Para los 3 detallados: `quote_founder` (long text) + `link_linkedin` (URL)

**`mf26_rockstars`** (N records)
- `nombre`, `org`, `rol`, `cohort_year` (2024/2025/2026)
- `foto_url` (attachment o URL)
- `confirmado_mf26` (checkbox)
- `featured_this_week` (checkbox · solo 1 activo)
- `orden_display` (number)

**`mf26_advisors`** (3 records · David, Corinne, Victor)
- `cupos_total` (2 / 5 / 5)
- `cupos_disponibles` (updateable manualmente o calculado)
- `link_calendly`

**`mf26_partners_tier3`** (12 records)
- `nombre`, `logo_url`, `tier` (3), `orden`

### CTAs a conectar

| Selector | Apunta a |
|---|---|
| `.cta-primary[href="#postular"]` y `.pricing-cta` | Landbot MF26-Postulación |
| `[data-todo="link-calendly-david"]` | Calendly David |
| `[data-todo="link-calendly-cori"]` | Calendly Corinne |
| `[data-todo="link-calendly-victor"]` | Calendly Victor |
| `.whatsapp-float` (`href="wa.me/..."`) | Número WhatsApp oficial MF (hoy es placeholder `56988888888`) |

### Assets pendientes (que Silvi/Nicole van a subir)

| `data-todo` | Archivo esperado | Path destino |
|---|---|---|
| `logo-real` (3x en trust strip) | Oracle, Corfo, Quintil Valley (SVG transparente) | `assets/logos/` |
| `foto-real` (1x hero) | Foto David clase 2022 | `assets/hero-david.jpg` |
| `foto-real` (3x instructores) | David, Yoel, Nathan | `assets/profesores/` |
| `foto-real` (3x advisors) | David, Corinne, Victor | `assets/advisors/` |
| `foto-real` (7x rockstars) | Nicolás de Camino + 6 confirmados MF26 | `assets/rockstars/` |
| Logos startups (casos strip) | 8 startups | `assets/logos-startups/` |

## Pricing toggle

Implementado en `app.js` (`initPricingToggle`). Dos modos:
- `upfront`: US$279/mes · US$837 total · 3 meses (default)
- `mensual`: US$349/mes · US$1.047 total · 3 meses

Ambos comparten features. El `<p id="pricing-fine-print">` cambia el copy según modalidad. Botón "Postular a MF26" único.

## Particularidades visuales a respetar

- **Verde Impacta** (`--impacta-green*` en `:root` de styles.css): se usa para el bloque Advisory + barra de fondos coinversores + advisor link inline en Pricing + WhatsApp float. **Si Silvi te pasa el hex exacto del manual de marca, cámbialo en una sola línea**.
- **Cross color** en botones de Advisory:
  - David (card naranja flagship) → botón transparente con borde verde (`.cta-cross-david-outline`)
  - Corinne y Victor (cards verdes recomendados) → botón naranja-rosado (`.cta-cross-cori`)
- **Carrusel de "Voces reales"**: auto-rotate cada 7s, pausa al hover de las arrows
- **Rotating word del recorrido**: cambia "¿Qué vas a [lograr/experimentar/vivir/hacer/aprender]?" cada 2.8s
- **Casos strip + fondos coinversores**: auto-scroll infinito horizontal, pausa al hover

## Compatibilidad

- Probado en Chrome desktop (macOS). Sin polyfills, ES2017+.
- Responsive con breakpoints a 900px y 600px.
- En mobile el `.main-nav` se oculta (queda pendiente burger menu si lo necesitan).

## Contacto

David (Bicho) para dudas estructurales o de copy.
Maca para coordinación de contenido vía Airtable.
