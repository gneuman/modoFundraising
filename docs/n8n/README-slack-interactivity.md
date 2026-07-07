# Slack Interactivity ACK — limpiar el warning ⚠️ de botones

Linear: [OP-1882](https://linear.app/gnb-labs/issue/OP-1882)

## Por qué existe esto

Slack muestra el warning ⚠️ **"Esta aplicación no está configurada para administrar
respuestas interactivas"** en cualquier botón — incluso si el botón solo abre una URL
(StreamYard, portal). Slack exige un **Request URL** al que avisar en cada clic, aunque
ahí no pase nada útil.

Es **cosmético** para botones tipo `url`: el link abre igual sin configurar nada. Este
webhook solo quita el triángulo, respondiendo `200` a lo que Slack mande.

## El workflow

Archivo importable: [`slack-interactivity-ack.json`](./slack-interactivity-ack.json)

Cuatro nodos:

1. **Webhook Slack** — POST en `/webhook/slack-interactivity`, `responseMode: responseNode`.
2. **¿url_verification?** — IF que detecta el ping de validación de Slack.
3. **Responder challenge** — si es el ping de validación, devuelve el `challenge` tal cual.
4. **Responder 200 (ok)** — para cualquier clic de botón, responde `200 ok` e ignora el payload.

La rama del `challenge` está de más por si algún día se conecta *Event Subscriptions* al
mismo URL (ahí sí Slack valida devolviendo el challenge). Para *Interactivity* con botones
de solo-URL, basta el `200`.

## Cómo activarlo (3 pasos)

1. **Importar y activar.** En n8n → *Import from File* → elige `slack-interactivity-ack.json`.
   **Activa el workflow** (toggle arriba a la derecha). Mientras esté inactivo, la
   Production URL no responde.
2. **Copiar la Production URL.** Abre el nodo *Webhook Slack* → pestaña **Production URL**
   → algo como `https://TU-N8N/webhook/slack-interactivity`. **No uses la Test URL**
   (esa solo vive mientras le das "Listen" en el editor).
3. **Pegar en Slack.** [api.slack.com](https://api.slack.com/apps) → tu app →
   *Interactivity & Shortcuts* → toggle **On** → pega la URL en **Request URL** →
   *Save Changes*. Slack pinga al guardar; como el webhook responde 200, valida y el ⚠️
   desaparece.

## Verificación (MAA)

- **Medir:** el warning ⚠️ en la app de Slack (binario: aparece / no aparece).
- **Analizar:** base = warning presente hoy en todos los botones. Tras activar =
  warning ausente; los clics de botón aparecen como ejecuciones con `200` en el log de
  n8n (*Executions*).
- **Actuar:** si Slack no valida al guardar → confirmar que el workflow está **activo** y
  que se pegó la **Production URL** (no la Test URL).

## Notas

- Cada clic en **cualquier** botón mandará un POST a este webhook. Con botones de solo-URL
  se ignora sin problema (por eso basta el 200).
- Solo hay que procesar el payload el día que se metan botones que **hagan** algo dentro
  de Slack (aprobar, responder, abrir modal). Ese sería un issue nuevo.
- Alcance de OP-1882: **solo el webhook**. Los mensajes de Slack del portal hoy mandan
  links en texto plano, no botones Block Kit — no se tocaron en este issue.
