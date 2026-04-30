# API Reference — Modo Fundraising 2026

**Base URL:** `https://modofundraising.vercel.app`

## Autenticación

Todos los endpoints admin aceptan el mismo **Bearer token**:

```
Authorization: Bearer <EMAIL_API_SECRET>
```

El `EMAIL_API_SECRET` está en `.env.local` y en las variables de Vercel.  
Valor actual: `mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C`

> También aceptan cookie de sesión admin (`mf_session`) si se llaman desde el browser.  
> Desde n8n / Make / Airtable Automations: **siempre usar Bearer token**.

---

## 1. Postulaciones

### Listar todas
```bash
curl https://modofundraising.vercel.app/api/admin/applications \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C"
```

### Cambiar status
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/applications \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "status": "Admitida"
  }'
```

**Status válidos:**
- `Nueva postulación`
- `En revisión`
- `Admitida` → envía email de admisión automáticamente
- `Rechazada` → envía email de rechazo automáticamente
- `Sin Respuesta`
- `Rechazada por founder`
- `Inscrita`
- `Churn`
- `Churn By Founder`
- `Invitada institucional`

### Rechazar con motivo
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/applications \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "status": "Rechazada",
    "rejection_reason": "El MRR no alcanza el mínimo requerido"
  }'
```

### Asignar cupón a postulación
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/applications \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "coupon_code": "ALUMNI15",
    "discount_percent": 15,
    "stripe_coupon_id": "coup_XXXXXXXXXXXX"
  }'
```

### Reenviar link de checkout
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/applications \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "action": "resend_checkout"
  }'
```
Respuesta: `{"success": true, "url": "https://modofundraising.vercel.app/checkout/eyJ..."}`

---

## 2. Envío de Emails

> Endpoint dedicado para n8n. Solo necesita `recordId` y `type`.  
> Busca todos los datos del founder en Airtable automáticamente.

### Admisión (link de pago)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "admision"
  }'
```
> Si tiene `discount_percent > 0`, manda el email de cupón en lugar del estándar.

### Cupón / Descuento
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "cupon"
  }'
```
> La postulación debe tener `discount_percent` asignado.

### Rechazo
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "rechazo"
  }'
```

### Follow-up 1 (primer recordatorio de pago pendiente)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "follow_up_1"
  }'
```

### Follow-up 2 (segundo recordatorio)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "follow_up_2"
  }'
```

### Bienvenida al portal (onboarding)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "onboarding"
  }'
```

### Confirmación de pago (cuota específica)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "pago_confirmado",
    "installment": 1
  }'
```
> `installment`: `1`, `2` o `3`

### Cancelación (churn)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/send-email \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "recXXXXXXXXXXXXXX",
    "type": "churn"
  }'
```

**Respuesta exitosa de todos los send-email:**
```json
{ "sent": "admision", "to": "founder@startup.com", "checkoutUrl": "https://..." }
```

**Tipos válidos:**
`admision` · `cupon` · `rechazo` · `follow_up_1` · `follow_up_2` · `onboarding` · `pago_confirmado` · `churn`

---

## 3. Cupones

### Listar cupones
```bash
curl https://modofundraising.vercel.app/api/admin/coupons \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C"
```

### Crear cupón (Stripe + Airtable)
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/coupons \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alumni 15%",
    "percentOff": 15,
    "code": "ALUMNI15",
    "description": "Descuento para alumni de programas anteriores"
  }'
```
**`percentOff` válidos:** `10` · `15` · `20` · `25` · `50` · `100`

Respuesta: `{"success": true, "couponId": "coup_XXXX", "code": "ALUMNI15"}`

### Enviar checkout con cupón a email específico
```bash
curl -X PUT https://modofundraising.vercel.app/api/admin/coupons \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@startup.com",
    "firstName": "María",
    "couponId": "coup_XXXXXXXXXXXX",
    "percentOff": 15
  }'
```

---

## 4. Clases

### Listar clases (con misiones y recursos)
```bash
curl https://modofundraising.vercel.app/api/admin/clases \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C"
```

### Crear clase
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/clases \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Clase 1 — Narrativa para inversores",
    "descripcion": "Cómo construir un pitch deck que convierte",
    "semana": 1,
    "fecha": "2026-06-02",
    "url_live": "https://meet.google.com/xxx-xxxx-xxx",
    "status": "Próxima"
  }'
```
**`status` válidos:** `Próxima` · `En vivo` · `Grabada`

### Actualizar clase
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/clases \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "recXXXXXXXXXXXXXX",
    "url_grabacion": "https://www.loom.com/share/XXXXXXXX",
    "status": "Grabada"
  }'
```

---

## 5. Misiones

### Crear misión
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/misiones \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Misión 1 — Executive Summary",
    "descripcion": "Redactá tu executive summary de 1 página",
    "instrucciones": "Incluí: problema, solución, mercado, tracción, equipo, ronda",
    "semana": 1,
    "dias_offset": 3,
    "fecha_limite": "2026-06-05",
    "claseId": "recXXXXXXXXXXXXXX",
    "status": "Próxima"
  }'
```
**`status` válidos:** `Próxima` · `Activa` · `Cerrada`

### Actualizar misión
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/misiones \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "recXXXXXXXXXXXXXX",
    "status": "Activa",
    "fecha_limite": "2026-06-07"
  }'
```

---

## 6. Recursos

### Crear recurso
```bash
curl -X POST https://modofundraising.vercel.app/api/admin/recursos \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Template Executive Summary",
    "url": "https://docs.google.com/document/d/XXXXXXXX",
    "tipo": "Template",
    "descripcion": "Plantilla editable para tu executive summary",
    "claseId": "recXXXXXXXXXXXXXX"
  }'
```

### Actualizar recurso
```bash
curl -X PATCH https://modofundraising.vercel.app/api/admin/recursos \
  -H "Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "recXXXXXXXXXXXXXX",
    "url": "https://docs.google.com/document/d/YYYYYYYY"
  }'
```

---

## Resumen

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/applications` | GET | Listar postulaciones |
| `/api/admin/applications` | PATCH | Cambiar status / asignar cupón / reenviar checkout |
| `/api/admin/send-email` | POST | Enviar email por recordId y tipo |
| `/api/admin/coupons` | GET | Listar cupones |
| `/api/admin/coupons` | POST | Crear cupón en Stripe + Airtable |
| `/api/admin/coupons` | PUT | Enviar checkout con cupón a email |
| `/api/admin/clases` | GET | Listar clases con misiones y recursos |
| `/api/admin/clases` | POST | Crear clase |
| `/api/admin/clases` | PATCH | Actualizar clase |
| `/api/admin/misiones` | POST | Crear misión |
| `/api/admin/misiones` | PATCH | Actualizar misión |
| `/api/admin/recursos` | POST | Crear recurso |
| `/api/admin/recursos` | PATCH | Actualizar recurso |

**Auth en todos:** `Authorization: Bearer mf2026_sk_live_QJxCbLtEVDqqCFbEWIxgrUx0FyQdeB4FtJUwkb5C`
