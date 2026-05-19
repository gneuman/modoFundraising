---
titulo: Pago único con 20% off fijo + códigos de descuento solo en cuotas
fecha: 2026-05-19
proyecto: modoFundraising
estado: completado
tipo: feature
tags: [stripe, pagos, descuentos, checkout]
---

## Objetivo original

Cambiar la lógica de pagos:
- **Códigos de descuento**: solo aplican a la opción de **3 cuotas mensuales**.
- **Pago único**: SIEMPRE incluye **20% off** fijo (sin importar si hay código).
- **Si el founder tiene código + paga único**: ambos descuentos se SUMAN
  (ej. 20% fijo + 10% código = 30% off total).

## Lo que se hizo

### 1. Backend — `src/lib/stripe.ts`
- Nueva constante `ONETIME_FIXED_DISCOUNT = 20`.
- Reescritura de `createOneTimeCheckout`:
  - Ya no recibe `couponId` ni `promotionCodeId`.
  - Recibe `extraDiscountPercent` (el % del código del founder si lo tiene).
  - Crea un **cupón Stripe dinámico** (`duration: "once"`, `max_redemptions: 1`)
    con `percent_off = min(100, 20 + extraDiscountPercent)`.
  - Aplica ese cupón único a la sesión y NO permite ingresar códigos en el
    checkout (todo el descuento ya viene calculado).

### 2. APIs — `src/app/api/checkout/session/route.ts` y `src/app/api/stripe/portal-checkout/route.ts`
- Cuando `mode === "payment"`, ya no pasan `couponId` / `promotionCodeId`.
- Pasan `extraDiscountPercent` resuelto desde el `couponRecord` (Airtable) o
  desde el JWT/app.

### 3. UI — `src/app/checkout/[token]/page.tsx` y `src/components/checkout/checkout-options.tsx`
- Cálculo separado:
  - `monthlyPrice = 349 * (1 - couponDiscount/100)`
  - `onetimeDiscount = min(100, 20 + couponDiscount)`
  - `fullPrice = 1047 * (1 - onetimeDiscount/100)`
- Badge del pago único cambió de "Ahorra US$X" a `{onetimeDiscount}% OFF`.
- Leyendas explican:
  - Cuotas: "Tu código de X% off aplica a esta opción."
  - Pago único sin código: "20% off automático por pago único."
  - Pago único con código: "20% off siempre + tu código de X% = N% off total."

### 4. Portal — `src/app/portal/suscripcion/suscripcion-client.tsx`
- Mismo cálculo del 20% fijo + cupón en la tarjeta de pago único.
- Badge "X% OFF" siempre visible en pago único.
- Corregido bug previo: el "Total" debajo de cuotas usaba `discountedOnetime`
  (precio del pago único). Ahora usa `discountedMonthly * 3`.
- Banner verde aclara: "código X% válido para cuotas o se suma al 20% del pago único".

## Archivos modificados

- `src/lib/stripe.ts`
- `src/app/api/checkout/session/route.ts`
- `src/app/api/stripe/portal-checkout/route.ts`
- `src/app/checkout/[token]/page.tsx`
- `src/components/checkout/checkout-options.tsx`
- `src/app/portal/suscripcion/suscripcion-client.tsx`

## Verificación pendiente

- [ ] Probar en STRIPE TEST: pago único sin cupón → 20% off ($1,047 → $837.60).
- [ ] Probar pago único con cupón 10% → 30% off ($1,047 → $732.90).
- [ ] Probar pago único con cupón 100% (beca) → 100% off ($0).
- [ ] Probar cuotas sin cupón → $349/mes × 3.
- [ ] Probar cuotas con cupón 25% → $262/mes × 3.
- [ ] Verificar que el cupón dinámico aparezca en Stripe Dashboard con metadata
      `fixed_pct=20` y `extra_pct=N`.
- [ ] Verificar webhooks de Stripe que dependan de coupon IDs (ninguno depende
      del cupón dinámico, pero confirmar).
