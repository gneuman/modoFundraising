# Configuración de Stripe — Modo Fundraising 2026

Este documento es para la persona que administra la cuenta de Stripe. No se necesita saber programación.

---

## ¿Para qué usamos Stripe?

Stripe procesa los pagos del programa (inscripciones). Nosotros ya tenemos todo el código listo — solo necesitamos las claves de acceso para conectarlo.

---

## Paso 1 — Crear cuenta en Stripe (si no existe)

1. Ir a **stripe.com** y crear una cuenta con el email de la empresa.
2. Completar la información del negocio (nombre legal, país, tipo de empresa).
3. Agregar información bancaria para recibir los pagos.

> Si ya tienen cuenta de Stripe, saltar al Paso 2.

---

## Paso 2 — Obtener las claves de API

1. Ingresar a **dashboard.stripe.com**
2. En el menú lateral izquierdo, ir a **Developers → API keys**
3. Ahí van a ver dos claves:
   - **Publishable key** — empieza con `pk_live_...`
   - **Secret key** — empieza con `sk_live_...` (hacer clic en "Reveal" para verla)
4. Copiar ambas y enviármelas por el canal seguro acordado.

> ⚠️ La Secret key es confidencial. No la compartas por email ni WhatsApp.

---

## Paso 3 — Crear los productos y precios

En Stripe hay que crear los dos productos que vamos a cobrar:

### Producto 1 — Suscripción mensual
1. Ir a **Products → Add product**
2. Nombre: `Modo Fundraising 2026 — Mensual`
3. Pricing: **Recurring**, mensual
4. Precio: el que definan (ej. USD 97/mes)
5. Guardar y copiarme el **Price ID** (empieza con `price_...`)

### Producto 2 — Pago único
1. Ir a **Products → Add product**
2. Nombre: `Modo Fundraising 2026 — Pago único`
3. Pricing: **One time**
4. Precio: el que definan (ej. USD 247)
5. Guardar y copiarme el **Price ID** (empieza con `price_...`)

---

## Paso 4 — Configurar el Webhook

El webhook es un canal que Stripe usa para avisarle al sitio cuando alguien paga. Hay que configurarlo **después de que tengamos el dominio final del sitio**.

> Por ahora usamos dominio temporal. Cuando tengamos el dominio definitivo (ej. `modofundraising.com`), hacemos este paso.

### Cuando tengamos el dominio:
1. Ir a **Developers → Webhooks**
2. Clic en **Add endpoint**
3. En la URL poner: `https://DOMINIO/api/stripe/webhook` (yo les paso la URL exacta)
4. En **Events to listen** seleccionar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Guardar y copiarme el **Signing secret** (empieza con `whsec_...`)

---

## Resumen de lo que me tienen que enviar

| Dato | Dónde se obtiene |
|------|-----------------|
| Publishable key (`pk_live_...`) | Dashboard → Developers → API keys |
| Secret key (`sk_live_...`) | Dashboard → Developers → API keys |
| Price ID mensual (`price_...`) | Dashboard → Products |
| Price ID pago único (`price_...`) | Dashboard → Products |
| Webhook signing secret (`whsec_...`) | Dashboard → Webhooks *(cuando tengamos dominio)* |

---

## Modo de prueba vs Producción

Stripe tiene un modo de prueba (Test) y producción (Live). Las claves de prueba empiezan con `pk_test_` y `sk_test_`. Actualmente el sitio usa claves de prueba — para cobrar dinero real necesitamos las claves Live del Paso 2.
