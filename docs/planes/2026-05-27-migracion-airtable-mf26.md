---
titulo: Migración de 8 startups IFSP26 desde Airtable de admisión a MF26
fecha: 2026-05-27
proyecto: modoFundraising
estado: completado
tipo: migracion-datos
tags: [airtable, mf26, ifsp26, startups, founders]
---

## Objetivo

Pasar la info de las 8 empresas admitidas en IFSP26 desde la base de Airtable de admisión (`appmKRVzbQavH6m2s`) a las tablas `Startups MF26` y `Founders MF26` del base operativo (`appGm9DW6WOKn...`). Las 8 ya existían en MF26 — solo había que llenar los campos vacíos.

## Decisiones

- **Match**: por `startup_name` (no por `RECORD_ID` del CSV, que apunta a otra base). 8/8 matches únicos.
- **Sobrescritura**: solo llenar vacíos. Si el destino ya tenía valor, no se toca.
- **Encoding**: limpiado en el script (mojibake UTF-8 del export).
- **Campos sin destino** (VCs Recomendados, Status Reunión, Fecha Reunión, Link Transcripción): skipped — no existen en MF26.
- **Valores raros** (LEAF round=500, Antü round=2): se escribieron tal cual venía en el CSV, por instrucción de Gabriel ("directo es lo que dice, no preguntemos").
- **`startup_industries`**: se dejó como `singleLineText` por ahora. Los valores multi-vertical se guardaron con coma ("EdTech,HRTech"). Migración a `multipleSelects` queda como pendiente futuro.

## Lo que se hizo

1. Inspeccionado schemas de `Startups MF26`, `Founders MF26`, `Postulaciones MF26` vía Meta API.
2. Match de las 8 startups por nombre → todas encontradas.
3. Dry-run que computa los patches sin escribir → `dry-run-report.json`.
4. Apply ejecutado → 8/8 startups actualizadas, 0 founders (ya tenían toda la info).

### Campos llenados por startup

| Startup | # campos nuevos |
|---|---|
| Kawesqar Travels | 10 (website, country, industries, description, mrr=0, sales_12m=6M, round_size=1.2M, round_series=Seed, round_tickets, deck_url) |
| PIXLAB CLASS | 7 (website, country, industries, description, mrr=33333, round_size=1M, deck_url) |
| Maity | 5 (website, country, industries, round_size=100k, deck_url) |
| Zeii | 8 (website, country, industries, description, mrr=0, round_size=200k, round_tickets, deck_url) |
| LEAF | 4 (website, country, industries, round_size=500) |
| Aventia Solutions | 4 (website, country, industries, round_size=300k) |
| Finsphera | 4 (website, country, industries, round_size=10M) |
| Antü | 8 (website, country, industries, description, mrr=18333, sales_12m=5M, round_size=2, deck_url) |

## Archivos modificados

- `docs/migracion-airtable-mf26/source.csv` — CSV fuente con encoding limpio
- `docs/migracion-airtable-mf26/dry-run.js` — genera los patches
- `docs/migracion-airtable-mf26/dry-run-report.json` — preview revisado antes de aplicar
- `docs/migracion-airtable-mf26/apply.js` — ejecuta los updates
- `docs/migracion-airtable-mf26/apply-log.json` — log de la corrida

## Verificación pendiente

- Confirmar visualmente en Airtable que los 8 registros tienen los nuevos campos.
- Revisar con la persona de admisión los valores sospechosos:
  - **LEAF** `round_size = 500` (¿faltó "k" o "M"?)
  - **Antü** `round_size = 2` (pitch habla de 500M CLP por 10%)
- Decidir si se migra `startup_industries` a `multipleSelects` (cambio que rompe el código actual — issue aparte).

## MAA

- **Medir**: 8/8 startups parchadas, 0 errores, 50 campos llenados en total.
- **Analizar**: el RECORD_ID del CSV apuntaba a otra base; el match por nombre funcionó 8/8 sin falsos positivos. Confirma que el naming en MF26 es consistente con el de admisión.
- **Actuar**: si vuelve a pasar (otra cohorte), el script `dry-run.js` + `apply.js` es reutilizable cambiando solo el bloque `SOURCE`. Vale documentar como pattern.
