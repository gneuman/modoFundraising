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

---

## 7. Endpoint `clase-upsert` (gate + diff + invitar Founders)

> Linear: [WI-1622](https://linear.app/gnb-labs/issue/WI-1622)

El endpoint `clase-changed` solo **updatea** eventos existentes. Para el flujo
completo de **crear evento + invitar Founders** sin spamear notificaciones cuando
se editan campos en draft, se usa el endpoint nuevo `POST /api/airtable/clase-upsert`.

### 7.1 Diferencias con `clase-changed`

| Aspecto | `clase-changed` | `clase-upsert` |
|---|---|---|
| Crea evento si no existe | ❌ | ✅ |
| Invita Founders activos (solo en CREATE) | ❌ | ✅ |
| Gate `listo_publicar` | ❌ | ✅ |
| Diff antes de patch | parcial | ✅ (no llama Calendar si nada cambió) |
| Auto-desmarca el checkbox tras éxito | n/a | ✅ |
| Triggea con | update de `titulo/descripcion/fecha` | check de `listo_publicar` |

> El portal `/admin/clases` (botón Guardar) usa el mismo `upsertCalendarEvent` —
> es la otra puerta hacia Calendar y se comporta igual: invita Founders solo
> en CREATE, hace diff en UPDATE.

### 7.2 Campo nuevo en Airtable: `listo_publicar`

Agregar a la tabla **Clases MF26**:

- **Nombre**: `listo_publicar`
- **Tipo**: Checkbox
- **Default**: false

Mientras esté desmarcado, el webhook no toca Calendar. El editor puede ajustar
título, fecha, descripción cuantas veces quiera sin generar invites ni
"evento actualizado" a Founders.

Opcional pero recomendado: campo `duracion_minutos` (number, default 90) para
sobrescribir la duración por clase. Si no existe, el endpoint usa 90 minutos.

### 7.3 Automation

1. **Create automation** → nombre: `Publicar Clase → Calendar + Founders`.
2. **Trigger**: `When record matches conditions`.
   - Table: **Clases MF26**.
   - Conditions: `listo_publicar` is `checked`.
3. **Action**: `Run a script` con el siguiente código (input variable `recordId`
   apuntando al field `Airtable record ID` del trigger):

```javascript
const SECRET = "PEGA-AQUI-EL-MISMO-AIRTABLE_WEBHOOK_SECRET";
const URL = "https://portal.modofundraising.com/api/airtable/clase-upsert";

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
  throw new Error(`Upsert falló: ${response.status} ${JSON.stringify(json)}`);
}
```

### 7.4 Respuesta esperada

```json
{
  "ok": true,
  "recordId": "recXXX",
  "titulo": "Clase 1: ICP",
  "fecha": "2026-08-15T19:00:00.000Z",
  "checkboxResetToFalse": true,
  "founders": {
    "eventId": "abc123",
    "action": "created" | "updated" | "noop",
    "changedFields": ["titulo", "fecha"],
    "attendeesAdded": 12
  },
  "team": {
    "eventId": "def456",
    "action": "created" | "updated" | "noop",
    "changedFields": []
  }
}
```

- `action: "noop"` significa que nada cambió en Calendar → no se envió ninguna
  notificación a Founders.
- `attendeesAdded > 0` solo en `action: "created"`. En `"updated"` siempre es 0
  (los attendees se mantienen aparte por el flujo de inscripción/churn).
- `checkboxResetToFalse: true` indica que el webhook desmarcó `listo_publicar`
  en Airtable. El próximo cambio en la clase se publica volviendo a marcar.

### 7.5 Comportamiento por campo

| Campo cambiado | Acción Calendar | `sendUpdates` |
|---|---|---|
| `titulo` | patch summary | `'all'` (notifica) |
| `fecha` | patch start/end | `'all'` (notifica) |
| `descripcion` | patch description | `'none'` (silencio) |
| `duracion_minutos` | patch end | `'all'` si cambia el end real |
| nada material | NO se llama Calendar | n/a |
| Founder nuevo en `portal_access` | el upsert NO los agrega — los agrega el flujo de inscripción separado | n/a |
| Founder churn | el upsert NO los quita — los quita `removeAttendeeFromAllEvents` aparte | n/a |

> **Por qué attendees solo en CREATE**: la lista de invitados de la clase es
> autoridad del flujo de inscripción/churn (un solo lugar para mantener). El
> upsert solo siembra el evento con los Founders activos en el momento que se
> crea. De ahí en adelante, agregar/quitar attendees pasa por
> `addAttendeesToAllEvents` / `removeAttendeeFromAllEvents`.

### 7.6 Smoke test

1. Crear clase nueva sin `calendar_event_id` y dejar `listo_publicar = false`.
2. Editar título 3 veces → no debe pasar nada en Calendar.
3. Marcar `listo_publicar` → debe crear evento Founders + Equipo, persistir
   `calendar_event_id` / `meet_link` en Airtable, mandar invite a todos los
   Founders con `portal_access = 1`. **Verificar que el checkbox se desmarcó solo.**
4. Editar descripción y volver a marcar `listo_publicar` → respuesta
   `changedFields: ['descripcion']`, ningún Founder recibe email, checkbox queda desmarcado.
5. Editar fecha y volver a marcar → respuesta `changedFields: ['fecha']`, todos
   los Founders reciben "evento actualizado", checkbox desmarcado.
6. Marcar sin haber cambiado nada → `action: "noop"` y checkbox desmarcado igual.
