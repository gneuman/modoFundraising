---
titulo: Fan-out de correos serial anclado a límites de Gmail + reenvío a fallidos
fecha: 2026-07-08
proyecto: Modo Fundraising 2026 — Web
estado: en-progreso
tipo: fix
tags: [gmail, correos, rate-limit, mision-activada, OP-1914]
---

## Objetivo

Que el envío de correos al activar una misión llegue al 100% del cohort sin
fallar por límites de Gmail, y reenviar a los 19 que fallaron en "Misión 2:
Techstack".

## Contexto del bug

Al activar "Misión 2: Techstack" (recqr2SmSAyTxJ6Os), el route
`mision-activada` disparó los 99 correos a Gmail **en paralelo total**
(`Promise.allSettled(destinatarios.map(...))`). Gmail rechazó los que
excedían su concurrencia por usuario:

- enviados: 80, fallidos: 19
- error: `Too many concurrent requests for user.`

## Límites reales de Gmail API (investigados, no supuestos)

- Rate por usuario: **6,000 quota units / minuto / usuario**.
- `messages.send` cuesta **100 units** → techo **60 correos/min = 1/seg**.
- Concurrencia alta también revienta (99 en paralelo → falla).

## Lo que se hizo

1. **Fix del route** — `src/app/api/airtable/mision-activada/route.ts`:
   fan-out **serial**, un correo a la vez con pausa de 1200ms (respeta el
   techo de 1/seg). Se agregó `export const maxDuration = 300` porque con
   ~99 founders el envío serial tarda ~2 min y el default de Vercel lo
   mataría. (Iteración: primero fueron lotes de 3, luego se ancló a 1/seg
   por el rate real.)
2. **Script de reenvío** — `scripts/reenviar-mision-fallidos.ts`: reenvía
   SOLO a una lista explícita de emails, en serie con pausa, sin tocar
   `notif_enviada_at` ni el status de la misión. No re-spamea a los 80.
3. **Reenvío ejecutado**: 19/19 entregados (16 en el primer pase + 3 en el
   reintento; los 3 fueron 500 transitorios de Airtable, no de Gmail).

## Archivos modificados

- `src/app/api/airtable/mision-activada/route.ts` (fan-out serial + maxDuration)
- `scripts/reenviar-mision-fallidos.ts` (nuevo)

## MAA

- **Medir:** correos entregados / destinatarios. Antes: 80/99 (81%).
  Tras reenvío: 99/99 (100%).
- **Analizar:** el 19% perdido fue 100% concurrencia, no bounces.
- **Actuar:** loop serial anclado al rate real (previene) + script de
  reenvío (cerró el gap). Sensor: el JSON de respuesta ya reporta
  `enviados/fallidos/failures` — es la métrica de la próxima vuelta.

## Verificación pendiente

- [ ] Mergear PR #53 (OP-1914) y validar en la PRÓXIMA misión activada real
      que llega a 99/99 sin fallos de concurrencia ni timeout del route.
- [ ] Confirmar que maxDuration=300 se respeta en el plan de Vercel actual.
