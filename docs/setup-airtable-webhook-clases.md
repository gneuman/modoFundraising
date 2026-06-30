# Setup: Webhook Airtable → Google Calendar (Clases MF26)

Este webhook mantiene los eventos de Google Calendar sincronizados con los
cambios que el admin haga en la tabla `Clases MF26` directamente desde la UI
de Airtable.

> Si el admin edita la clase desde el portal (`/admin/clases`), la sincronización
> ya pasa por el endpoint `PATCH /api/admin/clases` y NO requiere este webhook.
> Este flujo cubre el caso "alguien movió la fecha desde Airtable".

## 1. Variable de entorno

Agregar en `.env.local` y en Vercel:

```
AIRTABLE_WEBHOOK_SECRET=<algun-string-random-largo>
```

Genéralo con `openssl rand -hex 32` o cualquier generador de tokens.

## 2. Crear la Automation en Airtable

1. Abrir la base **Modo Fundraising 2026** → menú superior → **Automations**.
2. **Create automation** → nombre: `Sync Clases → Google Calendar`.
3. **Trigger**: `When record updated`.
   - Table: **Clases MF26**.
   - Fields: marcar **titulo**, **descripcion**, **fecha**.
   - (Opcional) Condition: `calendar_event_id is not empty` — para no disparar
     en clases que aún no tienen evento.
4. **Action**: `Run a script`. Pegar el script de abajo en la sección 3.

Si tu plan de Airtable permite "Send a webhook" como acción nativa, también
sirve; manda POST con body JSON `{ secret, recordId }` a la URL del endpoint.
La acción "Run script" funciona en todos los planes.

## 3. Script para la acción `Run a script`

```javascript
const SECRET = "PEGA-AQUI-EL-MISMO-AIRTABLE_WEBHOOK_SECRET";
const URL = "https://portal.modofundraising.com/api/airtable/clase-changed";

// Cuando el trigger es "When record updated", Airtable expone el record en input.config()
const inputConfig = input.config();
const recordId = inputConfig.recordId;

const response = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret: SECRET, recordId }),
});

const json = await response.json();
console.log("Status:", response.status, "Body:", json);

if (!response.ok) {
  throw new Error(`Sync falló: ${response.status} ${JSON.stringify(json)}`);
}
```

En el panel del script (lado derecho de Airtable), agregar **un Input variable**:

- Name: `recordId`
- Value: insertar el field `Airtable record ID` del trigger (botón **+**).

## 4. Probar

1. En Airtable, editar el **titulo** de una clase de prueba.
2. Esperar 5-10 segundos.
3. Verificar en Google Calendar que el evento se renombró.
4. En el log de la Automation de Airtable debe aparecer `Status: 200` y el body
   con `eventsUpdated: 2`.

## 5. Comportamiento esperado

| Campo cambiado en Airtable | Qué pasa en Calendar |
|---|---|
| `titulo` | Se renombra el evento de founders y el de equipo (con prefijo `[Equipo]`). |
| `fecha` | Se reagenda el evento. Google notifica a los asistentes (`sendUpdates: "all"`). |
| `descripcion` | Se actualiza la descripción. |
| `calendar_event_id` vacío | El endpoint responde `skipped` y no crea evento. Para crear, dar de alta la clase desde `/admin/clases`. |

## 6. Troubleshooting

- **403 Forbidden**: el secret del script no coincide con `AIRTABLE_WEBHOOK_SECRET`.
- **404 Clase not found**: el `recordId` no existe en Airtable o el cache de
  Next no refresca. Reintentar después de 60s.
- **eventsFailed > 0**: el evento en Calendar fue borrado fuera de banda.
  Revisar con `npx tsx scripts/inspect-clases.ts` y recrear desde `/admin/clases`.
