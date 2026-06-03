---
titulo: Activar los 3 crons de email vía n8n (form-reminder, follow-up, cobranza)
fecha: 2026-06-03
proyecto: modoFundraising
estado: pendiente-config-n8n-vercel
tipo: ops
tags: [cron, n8n, email, airtable, vercel]
---

## Objetivo

Los 3 crons de email YA están codeados y actualizan sus casillas en Airtable
correctamente, pero **no se ejecutan**: no hay `vercel.json` y dependían de n8n
externo que no está configurado. Vercel Hobby limita Cron a 1/día, así que el
motor es **n8n**. Falta: (1) `CRON_SECRET` en Vercel, (2) los 3 workflows en n8n.

## Diagnóstico (2026-06-03)

- `form-reminder`: envía recordatorio 1h tras abandonar el form; marca `form_reminder_sent_at`.
- `followup`: 2 follow-ups a "Admitida" sin pago; marca `follow_up_1/2_sent` + fechas; cierra a "Sin Respuesta".
- `cobranza`: 3 avisos de pago fallido; marca `payment_reminder_1/2/3_at`; suspende a "Churn".
- Sensor de cobranza (`payment_failed_at`) lo estampa bien el webhook de Stripe.
- **Ninguno corre** porque nada llama los endpoints con `Authorization: Bearer <CRON_SECRET>`.

## Paso 1 — CRON_SECRET en Vercel

En Vercel → Project (modoFundraising) → Settings → Environment Variables, agregar:

```
CRON_SECRET = 9dfb63fa22424e9c8d5c1cc28aca03328d3c078855b4ea826fdc430cf815968d
```

(Producción + Preview. Tras agregarla, **redeploy** para que tome efecto.)
Guardar el mismo valor para usarlo en n8n. Es un secreto: no commitearlo.

## Paso 2 — Tres workflows en n8n

Base URL de producción: `https://<dominio-mf26>` (confirmar el dominio real en Vercel).
Cada workflow = un nodo **Schedule Trigger** + un nodo **HTTP Request**.

### Config común del nodo HTTP Request

- **Method:** `POST`
- **URL:** `https://<dominio>/api/cron/<endpoint>`
- **Authentication:** Generic → Header Auth
  - Header Name: `Authorization`
  - Header Value: `Bearer 9dfb63fa22424e9c8d5c1cc28aca03328d3c078855b4ea826fdc430cf815968d`
- **Body:** ninguno (los endpoints no leen body)
- **Response:** dejar que devuelva JSON `{ processed, actions, errors }`

### Workflow A — Form reminder (cada 30 min)

- Schedule Trigger: cada 30 minutos.
- HTTP POST → `/api/cron/form-reminder`
- Manda recordatorio a quien inició el form hace ≥1h y no lo terminó.

### Workflow B — Follow-up admisiones (1×/día)

- Schedule Trigger: diario, p. ej. 14:00 UTC.
- HTTP POST → `/api/cron/followup`
- Manda follow-up 1 (≥2d tras admitir), follow-up 2 (≥2d tras f1), cierra (≥2d tras f2).

### Workflow C — Cobranza (1×/día)

- Schedule Trigger: diario, p. ej. 15:00 UTC.
- HTTP POST → `/api/cron/cobranza`
- Avisos escalonados a inscritas con pago fallido; suspende tras 3er aviso.

## Verificación

Para cada endpoint, primero un **GET preview** (no envía nada, solo lista a quién
tocaría). Desde la terminal (sin exponer el secreto en historial, leyendo de env):

```bash
# preview, no envía
curl -s https://<dominio>/api/cron/followup -H "Authorization: Bearer <CRON_SECRET>" | jq
curl -s https://<dominio>/api/cron/cobranza -H "Authorization: Bearer <CRON_SECRET>" | jq
curl -s https://<dominio>/api/cron/form-reminder -H "Authorization: Bearer <CRON_SECRET>" | jq
```

- `count > 0` → hay candidatos; el POST de n8n los procesará.
- Tras el primer POST real, revisar en Airtable que se hayan marcado las casillas
  (`form_reminder_sent_at`, `follow_up_1_sent`, `payment_reminder_1_at`, etc.).

## Pendiente extra (ligado, no bloqueante)

- Campo `form_reminder_sent_at` debe existir en `Postulaciones MF26` y el template
  `form_abandonado` activo (ver plan 2026-05-28). Sin el campo, reenvía cada corrida.

## MAA (Medir-Analizar-Actuar)

- **Medir:** % de correos que efectivamente se mandan (n8n logs) y casillas marcadas en Airtable.
- **Analizar:** comparar vs hoy (0 enviados). Tasa de recuperación form / conversión follow-up / recuperación cobranza.
- **Actuar:** ajustar frecuencias y timing según lo que mueva cada métrica.
