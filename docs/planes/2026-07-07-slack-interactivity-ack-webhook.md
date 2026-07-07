---
titulo: Slack Interactivity ACK — webhook n8n que responde 200
fecha: 2026-07-07
proyecto: Modo Fundraising 2026 — Web
estado: en-revision
tipo: infra
tags: [slack, n8n, webhook, notificaciones]
linear: OP-1882
pr: 46
---

## Objetivo

Limpiar el warning ⚠️ "Esta aplicación no está configurada para administrar respuestas
interactivas" que Slack muestra en cualquier botón (aunque solo abra una URL como
StreamYard o el portal). Slack exige un Request URL al que avisar en cada clic; basta con
que algo responda `200`.

## Lo que se hizo

- Se creó el issue **OP-1882** en Linear (team OP, proyecto Modo Fundraising 2026 — Web).
- Se sacó la rama `gneuman/op-1882-...` desde `main` limpio (OP-1881, en curso en otra
  rama con cambios sin commitear, quedó intacto — no se mezcló).
- Se armó el workflow n8n importable con 4 nodos: Webhook (POST, responseNode) → IF
  `url_verification` → Respond challenge / Respond 200 ok.
- Se documentaron los pasos de activación (importar+activar, copiar Production URL,
  pegar en api.slack.com → Interactivity → Request URL).
- Commit conventional + push → auto-PR **#46** abierto solo.

## Archivos modificados

- `docs/n8n/slack-interactivity-ack.json` (nuevo) — workflow importable.
- `docs/n8n/README-slack-interactivity.md` (nuevo) — pasos de activación + MAA.

## MAA

- **Medir:** warning ⚠️ presente/ausente en la app de Slack (binario).
- **Analizar:** base = warning en todos los botones hoy. Post = ausente + clics devuelven
  200 en el log de Executions de n8n.
- **Actuar:** si no valida al guardar → workflow activo + Production URL (no Test URL).

## Verificación pendiente (para pasar a Done)

Esto es **infra fuera del repo**: el merge del PR NO lo activa. Un humano debe, contra el
ambiente real:

1. Importar `slack-interactivity-ack.json` a n8n y **activar** el workflow.
2. Copiar la Production URL del webhook.
3. Pegarla en api.slack.com → app → Interactivity & Shortcuts → Request URL → Save.
4. Confirmar que Slack valida (sin error al guardar) y que el ⚠️ desaparece en los botones.

Solo cuando esos 4 pasos estén ✅ contra Slack real, OP-1882 pasa a Done.

## Fuera de alcance (posible issue futuro)

- Migrar los mensajes de Slack del portal (session-notify, cobranza, etc.) de link-en-texto
  a botones Block Kit reales. Hoy mandan texto plano; no se tocaron.
- Procesar el payload de los clics (solo necesario si algún botón hace algo dentro de Slack).
