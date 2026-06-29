---
titulo: UX/UI mobile-first del portal de participantes
fecha: 2026-06-27
proyecto: modoFundraising
estado: implementado (pendiente verificacion visual con sesion real)
tipo: ui
tags: [portal, mobile, responsive, sidebar, ux]
---

## Objetivo

Hacer el portal de participantes (`/portal`) usable en movil. Diagnostico:
el shell era desktop-only — sidebar `w-60` fijo siempre visible comia 240px
permanentes, sin hamburguesa ni nav inferior. Las paginas internas ya eran
responsive; el dano estaba concentrado en el shell.

## Lo que se hizo

- **Sidebar** (`src/components/portal/sidebar.tsx`): se extrajo el contenido a
  `SidebarContent` reutilizable. `PortalSidebar` ahora es `hidden lg:flex`.
  Nuevo `PortalMobileHeader`: header sticky con logo + hamburguesa que abre un
  drawer deslizante (overlay, bloqueo de scroll del body, cierre al navegar).
- **Layout** (`src/app/portal/layout.tsx`): `flex` rigido → `flex-col lg:flex-row`.
  Padding `p-8` → `p-4 sm:p-6 lg:p-8`. Banner de pago apila en columna en movil.
  Se monta `PortalMobileHeader` junto al sidebar en ambas ramas (con/sin acceso).
- **Clases** (`src/app/portal/clases/page.tsx`): stats `grid-cols-4` →
  `grid-cols-2 lg:grid-cols-4`.
- **Equipo** (`src/app/portal/equipo/equipo-client.tsx`): nombre con `truncate`,
  badge de rol `hidden sm:inline-flex` + `max-w-30 truncate`, form de edicion
  inline `grid-cols-1 sm:grid-cols-2`.

## Archivos modificados

- src/components/portal/sidebar.tsx
- src/app/portal/layout.tsx
- src/app/portal/clases/page.tsx
- src/app/portal/equipo/equipo-client.tsx

## Verificacion

- `tsc --noEmit` exit 0. Los errores que aparecen en el output son preexistentes
  y en archivos no tocados (scripts/, admin/, apply/, airtable.ts).
- PENDIENTE: verificacion visual con sesion real (el portal requiere auth; no se
  puede screenshotear headless sin credenciales).

## MAA

- **Medir:** % de sesiones movil que completan una accion en el portal.
- **Analizar:** comparar 2 semanas post-cambio vs. previas. Si no se captura
  device-type en el portal, agregar ese sensor antes de cerrar el ciclo.
- **Actuar:** este refactor del shell es la accion; siguiente vuelta segun datos.
