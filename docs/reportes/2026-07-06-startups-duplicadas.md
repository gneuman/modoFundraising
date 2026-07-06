# Reporte: Startups duplicadas — MF26

Generado 2026-07-06. Fuente: Airtable Startups MF26. Relacionado: WI-1845 (conteo de asistencia).

## Resumen ejecutivo

6 startups existen como **registros duplicados** en la tabla Startups MF26 (diferencia
de mayúsculas/espacios en el nombre). Las asistencias caen a veces en el registro "real"
(el de la aplicación, con 25-33 campos poblados) y a veces en un duplicado flaco. Efecto:
el conteo de sesiones del portal se **parte** o se **infla** (caso reportado: LEAF 3/28).

**Causa de fondo (no solo dato sucio):** el flujo de asistencia/aplicación resuelve la
startup de forma inconsistente — se crea o se referencia un registro de startup distinto
al de la aplicación original. Mientras eso no se arregle, seguirán apareciendo duplicados.

**Recomendación de merge (por par):** conservar el registro con el perfil más completo
(más campos poblados) como "master", mover sus asistencias/founders al master, deduplicar
las clases repetidas, y borrar el duplicado. NO ejecutado — requiere validación humana por
las apps/founders/suscripciones que puedan colgar de cada registro.

| Startup | Master sugerido | Duplicado(s) a fusionar | Nota |
|---|---|---|---|
| LEAF | `recftnlzi1BfkwvY6` ("LEAF ", 31 campos, 2 founders) | `receBsGwRTevqKsEo` ("LEAF", 3 campos) | Program Launch está en ambos → dejar 1 |
| Quintil Valley | `recuLOLdRslVfsOWY` (27 campos) | `recTqEiA0TGYEMYYw`, `recCmGpdjlTRgHQzE` | Ariel duplicado entre 2 records |
| femtech | `recyFoEH3RKiiXMnU` (29 campos, tiene asist.) | `recncczQVnqVq8xgF` (vacío) | Simple |
| Teknobuilding | `recWm1wzZD7Wt4l7o` (tiene asist.) | `recAv5AxuCrlkatXh` (vacío) | Simple |
| Openmall | revisar (ambos con founder, 0 asist.) | — | Ninguno tiene asistencia; decidir cuál queda |
| TestCo | (datos de prueba) | — | Ignorar / borrar todos si no se usan |

---

## Detalle por startup

## "testco" — 6 records

- **rec54ghwzntkjhAs9** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 25 campos
- **rec8O7aHyxteKXR68** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 19 campos
- **recIFrNpYd9CBM7lu** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 21 campos
- **recN15xQwOSn6gHPU** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 21 campos
- **recnkeQePE7FoH3jF** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 16 campos
- **recranuld1I5iGxuB** — nombre: "TestCo"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 0
  - status/otros campos con valor: 26 campos

## "teknobuilding" — 2 records

- **recAv5AxuCrlkatXh** — nombre: "Teknobuilding"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 1
  - status/otros campos con valor: 32 campos
- **recWm1wzZD7Wt4l7o** — nombre: "Teknobuilding"
  - asistencias: 1 → clases: Program Launch - 🚀 Modo Fundraising 2026 
  - founders vinculados: 1
  - status/otros campos con valor: 26 campos

## "quintil valley" — 3 records

- **recCmGpdjlTRgHQzE** — nombre: "Quintil Valley "
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 1
  - status/otros campos con valor: 24 campos
- **recTqEiA0TGYEMYYw** — nombre: "Quintil Valley"
  - asistencias: 2 → clases: Program Launch - 🚀 Modo Fundraising 2026 , Rockstar: Ariel Revollo 🇧🇴 | MOBI LATAM
  - founders vinculados: 1
  - status/otros campos con valor: 15 campos
- **recuLOLdRslVfsOWY** — nombre: "Quintil Valley"
  - asistencias: 1 → clases: Rockstar: Ariel Revollo 🇧🇴 | MOBI LATAM
  - founders vinculados: 1
  - status/otros campos con valor: 27 campos

## "openmall" — 2 records

- **recNjr5IGwPq36Rmv** — nombre: "Openmall"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 1
  - status/otros campos con valor: 33 campos
- **recSCopLZPAkumUnA** — nombre: "Openmall"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 1
  - status/otros campos con valor: 25 campos

## "leaf" — 2 records

- **receBsGwRTevqKsEo** — nombre: "LEAF"
  - asistencias: 1 → clases: Program Launch - 🚀 Modo Fundraising 2026 
  - founders vinculados: 0
  - status/otros campos con valor: 3 campos
- **recftnlzi1BfkwvY6** — nombre: "LEAF "
  - asistencias: 2 → clases: Rockstar: Ariel Revollo 🇧🇴 | MOBI LATAM, Program Launch - 🚀 Modo Fundraising 2026 
  - founders vinculados: 2
  - status/otros campos con valor: 31 campos

## "femtech" — 2 records

- **recncczQVnqVq8xgF** — nombre: "femtech"
  - asistencias: 0 → clases: (ninguna)
  - founders vinculados: 1
  - status/otros campos con valor: 25 campos
- **recyFoEH3RKiiXMnU** — nombre: "femtech"
  - asistencias: 2 → clases: Rockstar: Ariel Revollo 🇧🇴 | MOBI LATAM, Program Launch - 🚀 Modo Fundraising 2026 
  - founders vinculados: 1
  - status/otros campos con valor: 29 campos
