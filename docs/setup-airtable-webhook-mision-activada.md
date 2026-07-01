# Setup: Webhook Airtable → correo a Founders al activar una Misión

Este webhook manda un correo automático a **todos los Founders con
`portal_access = 1`** cuando David/Maca pasa una Misión de `Misiones MF26`
a status = **"Activa"**.

Es idempotente: usa el campo `notif_enviada_at` de la misión para no
re-enviar aunque Airtable dispare el trigger 2 veces.

## 1. Variables de entorno (ya deberían estar)

Usa el **mismo** `AIRTABLE_WEBHOOK_SECRET` que `clase-upsert` — un solo
secreto para todos los webhooks Airtable → portal.

```
AIRTABLE_WEBHOOK_SECRET=<mismo-string-que-clase-upsert>
```

## 2. Campo nuevo en `Misiones MF26`

Agregar en la tabla:

- **`notif_enviada_at`** — tipo Date & Time (formato ISO). Se llena solo
  desde el endpoint. Para forzar un re-envío, vaciarlo manual.

## 3. Template de correo en `Email Templates MF26`

Crear un template nuevo con:

- **name**: `mision_activada`
- **label**: `Misión Activa — aviso a founders`
- **subject**: `Nueva misión: {{mision_titulo}}`
- **active**: ✅
- **body_html** (base):

```html
<h2>Hola {{nombre}},</h2>
<p>Se activó una nueva misión en el portal:</p>
<p><strong>{{mision_titulo}}</strong></p>
<p>{{mision_descripcion}}</p>
<p>Fecha límite: <strong>{{fecha_limite}}</strong></p>
<p><a href="{{portal_url}}">Ver misión en el portal →</a></p>
```

Variables disponibles: `nombre`, `email`, `mision_titulo`,
`mision_descripcion`, `fecha_limite`, `portal_url`.

Después crear la **Automation Rule** en `Automation Rules MF26`:

- **name**: `Misión activada`
- **trigger_event**: `mision_activada`
- **template_id**: (link al template `mision_activada`)
- **channel**: `email`
- **active**: ✅
- **delay_hours**: 0
- **order**: 1

## 4. Airtable Automation

1. Abrir base **Modo Fundraising 2026** → **Automations** → **Create automation**.
2. Nombre: `Notif Founders — Misión Activa`.
3. **Trigger**: `When record matches conditions`.
   - Table: **Misiones MF26**.
   - Condition: `status is Activa` AND `notif_enviada_at is empty`.
4. **Action**: `Run a script`. Pegar el script de la sección 5.

## 5. Script para la Action `Run a script`

```javascript
const SECRET = "PEGA-AQUI-EL-MISMO-AIRTABLE_WEBHOOK_SECRET";
const URL = "https://portal.modofundraising.com/api/airtable/mision-activada";

const inputConfig = input.config();
const recordId = inputConfig.recordId;

const response = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: SECRET,
    recordId,
    // Descomentar para probar sin spamear al cohort:
    // testEmail: "neumang@gmail.com"
  }),
});

const json = await response.json();
console.log("Status:", response.status, "Body:", json);

if (!response.ok) {
  throw new Error(`Notif falló: ${response.status} ${JSON.stringify(json)}`);
}
```

En la sección **Input variables** del script, agregar:

- Name: `recordId` → Value: `Record ID` de la trigger.

## 6. Prueba en vivo

**Paso 1 — Test con tu email (sin spamear al cohort):**

1. En el script de la Automation, descomentar la línea `testEmail`.
2. Crear una Misión de prueba con status = `Activa`.
3. La Automation dispara → el endpoint manda 1 correo a `testEmail`.
4. Verificar que llegó y que el template renderea las variables OK.

**Paso 2 — Activar en producción:**

1. Volver a comentar `testEmail` en el script.
2. La Automation ahora manda a **todos** los founders con
   `portal_access = 1`.

**Paso 3 — Re-envío controlado:**

Si necesitás re-enviar (fixeaste un typo del template y ya se mandó):

1. En Airtable, vaciar `notif_enviada_at` de la misión.
2. La Automation dispara automáticamente (por el condition
   `notif_enviada_at is empty`) — o marcá status a otra cosa y de
   vuelta a `Activa`.

## 7. Comportamiento esperado

| Escenario | Respuesta |
|---|---|
| Misión pasa a `Activa` por primera vez | 200 + fan-out a todos los founders |
| Misión ya con `notif_enviada_at` | 200 + `skipped` (no re-envía) |
| Misión con status ≠ `Activa` | 200 + `skipped` |
| Airtable retryea 2x seguidos | Segundo request devuelve `skipped` por el lock |
| Falla el correo a un founder | El resto sigue; queda logueado |

## 8. Logs

Buscar en Vercel:

- `[mision-activada]` — logs del endpoint (gate, lock, resultado).
- `[automation] sending trigger=mision_activada` — cada correo enviado.
- `[automation] FAILED trigger=mision_activada` — correos fallidos.
