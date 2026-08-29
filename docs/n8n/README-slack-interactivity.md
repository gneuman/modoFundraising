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

---

# Mensajes de Slack con botón

Archivo importable: [`slack-mensajes-con-boton.json`](./slack-mensajes-con-boton.json)

Tres nodos `httpRequest` a `chat.postMessage` (mismo patrón que tu nodo `Slack Bot`),
con la credencial **APP Modo Fundraising** (`httpHeaderAuth`):

| Nodo | Botón | URL del botón |
|---|---|---|
| **Slack: sesión en vivo (StreamYard)** | 🔴 Entrar al vivo | sacada de `slack.texto` (`session-notify` tipo `start`, usa `url_live`) |
| **Slack: Abrir portal** | Abrir portal | fija: `https://portal.modofundraising.com/` |
| **Slack: recordatorio (24h/1h)** | Ver en el portal | sacada de `slack.texto` (`session-notify` tipo `24h` o `1h`) |

## Lo que importa para que el botón funcione y NO dé error

Un botón interactivo de Slack solo necesita **dos cosas** para funcionar sin warning:

1. **`action_id`** — un identificador único (ya está en cada nodo).
2. **`url`** — el link a abrir.

El warning ⚠️ **no lo causa el botón** — lo causa no tener el Request URL configurado.
Como el webhook de arriba ya está conectado en Slack, el warning **ya no aparece**, sin
importar cuántos botones mandes. Los dos temas son independientes:

- **Webhook** (parte de arriba) → limpia el warning. Se configura **una vez**.
- **Botones** (esta parte) → cada mensaje. Solo necesitan `action_id` + `url`.

## De dónde sale la URL "sin importar la liga"

Los nodos de sesión/recordatorio **no hardcodean la URL**. La sacan del `slack.texto` que
devuelve `session-notify`, que ya trae el link bueno embebido como `<https://...|texto>`:

```
url = texto.match(/<(https?:\/\/[^>|]+)/)[1]  ||  https://portal.modofundraising.com/portal/clases
```

Si por lo que sea no encuentra link en el texto, **cae al portal** — así el botón
**nunca queda sin liga ni se rompe**. Respeta la regla `url_live` vs `meet_link`: el
endpoint solo expone `url_live` (StreamYard), nunca el `meet_link` interno.

## Cómo conectarlos

Los nodos de sesión/recordatorio esperan recibir el `$json.slack` de un nodo
`POST session-notify` **anterior** (el que ya tienes en el workflow de notificaciones).
Es decir: reemplazan (o siguen a) el nodo `Slack post` de texto plano por uno de estos
con botón. El nodo **Abrir portal** es independiente — no necesita nada antes.

> Ajusta el `channel` del nodo *Abrir portal* si `C0BFL2J81QB` no es el canal correcto
> (era el de tu mensaje de prueba).

## Alcance

- OP-1882 entrega el **webhook** (limpia el warning) + estos **nodos de mensaje** listos
  para importar a n8n. Es infra de n8n — el merge del PR NO los activa; se importan y
  conectan a mano en n8n.
- Si en el futuro quieres que el portal devuelva `slack.url` / `slack.blocks` crudos (en
  vez de que n8n extraiga la URL del texto), eso toca código del portal → issue aparte.
