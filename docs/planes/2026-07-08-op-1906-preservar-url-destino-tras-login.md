---
titulo: Preservar URL destino tras login (deep-link vuelve tras magic link)
fecha: 2026-07-08
proyecto: Modo Fundraising 2026 — Web
estado: en-revision
tipo: feature
tags: [portal, auth, magic-link, deep-link, seguridad]
issue: OP-1906
pr: 50
---

## Objetivo

Que un founder que abre `https://portal.modofundraising.com/portal/misiones`
(u otra subruta del portal) sin sesión, tras loguearse con su magic link,
regrese a esa misma URL en vez de caer en el home `/portal` fijo.

## Lo que se hizo

Se propaga un parámetro `next` (la ruta destino) por toda la cadena de auth,
**firmado dentro del token JWT** del magic link — no en la query del correo —
para evitar un open-redirect manipulable.

Cadena:
1. `portal/layout.tsx` — al redirigir sin sesión, adjunta el pathname:
   `/ingresar?next=/portal/misiones`.
2. `magic-login-form.tsx` — el form lee `next` del URL y lo manda en el POST.
3. `api/auth/magic/route.ts` — sanitiza `next` y lo incrusta en el token.
4. `lib/auth.ts` — `crearTokenMagic` firma el `next`; `verificarTokenMagic` lo
   devuelve; nueva helper `sanitizarNext` (solo rutas internas `/...`, rechaza
   `//host` y `/\` para no permitir redirect a otro host).
5. `api/auth/verify/route.ts` — redirige al `next` del token en vez de `/portal`
   fijo. Preserva el destino también en el auto-reenvío cuando el link expira.

Aplica a **todos los founders**. Admin siempre va a `/admin/dashboard`
(ignora `next`).

## Archivos modificados

- `src/app/portal/layout.tsx`
- `src/components/auth/magic-login-form.tsx`
- `src/app/api/auth/magic/route.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/verify/route.ts`

## MAA

- **Medir:** % de founders que abren un deep-link a una subruta del portal sin
  sesión y terminan en esa misma página tras el login (antes: 0% — siempre
  caían en `/portal`).
- **Analizar:** vs comportamiento previo donde todo link profundo se perdía.
- **Actuar:** deep-link preservado end-to-end vía token firmado.

## Verificación pendiente (validar en prod)

- [ ] Abrir `/portal/misiones` sin sesión → login → vuelve a `/portal/misiones`.
- [ ] Link manipulado `next=//evil.com` o `next=https://evil.com` → cae a
      `/portal` (sanitizado).
- [ ] Admin login → sigue yendo a `/admin/dashboard`.
- [ ] Link expirado con `next` → el reenvío conserva el destino.
