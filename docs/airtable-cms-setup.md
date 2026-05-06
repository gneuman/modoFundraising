# Airtable CMS — Setup de tablas públicas MF26

Base: `appGm9DW6WOKnDEAW`

---

## 1. `home_metrics`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| edicion | Single line text | "2025" o "2026" |
| capital_levantado_usd | Number | Integer |
| n_startups | Number | Integer |
| n_paises | Number | Integer |
| n_inversionistas | Number | Integer |
| n_masterclasses | Number | Integer |
| nps | Number | 0-100 |
| activa | Checkbox | Solo 1 activa por edición |

**Registros iniciales:** 1 fila con edicion="2025", activa=true, con los números que tenga Nicole.

---

## 2. `home_testimonios`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| nombre | Single line text | |
| empresa | Single line text | |
| ronda | Single line text | Ej: "Seed US$1.2M" |
| quote | Long text | Texto del testimonio |
| foto_url | URL | Link directo a imagen |
| orden | Number | Integer, ordena los cards |
| activa | Checkbox | |

**Registros iniciales:** 3 founders (owners: Maca/Nicole).

---

## 3. `home_casos_exito`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| startup_nombre | Single line text | |
| logo_url | URL | |
| monto_usd | Number | En USD, sin símbolo |
| investors | Single line text | Ej: "a16z, Kaszek" |
| hook | Single line text | 1 línea de gancho |
| orden | Number | Max 6 records activos |
| activa | Checkbox | |

**Registros iniciales:** 6 casos (owners: Maca/Lola, deadline 14-may).

---

## 4. `home_logos_alumni`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| nombre | Single line text | Nombre de la startup |
| logo_url | URL | Preferir fondo transparente PNG |
| alt | Single line text | Texto alternativo accesibilidad |
| orden | Number | |
| activa | Checkbox | |

---

## 5. `home_logos_partners`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| nombre | Single line text | |
| logo_url | URL | |
| alt | Single line text | |
| tier | Number | 1=Oracle, 2=Corfo+Quintil, 3=Program Partners |
| type | Single select | corporate / paying / program |
| website_url | URL | Opcional |
| orden | Number | |
| activa | Checkbox | |

**Registros iniciales:**
- tier 1: Oracle (type=corporate)
- tier 2: Corfo, Quintil Valley (type=paying)
- tier 3: Program Partners (type=program)

---

## 6. `advisors`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| nombre | Single line text | |
| foto_url | URL | Cuadrada 1:1, < 100KB |
| cargo | Single line text | Ej: "Strategic Partner" |
| track_record | Long text | Bio/track record |
| especialidad | Single line text | |
| ideal_para | Single line text | "Para quién es ideal" |
| formato | Single line text | Ej: "30 min semanales, 1:1" |
| pricing_display | Single line text | Ej: "Desde US$1.000/mes" |
| modalidad | Single line text | Ej: "Fee mensual" |
| calendly_url | URL | URL de Calendly individual |
| orden | Number | |
| activa | Checkbox | |

**Registros iniciales:**
1. David Alvo — orden 1 — "Desde US$2.000/mes"
2. Victor Lau — orden 2 — "Desde US$1.000/mes"
3. Corinne Lebrun — orden 3 — "Desde US$1.000/mes"

---

## 7. `masterclasses`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| titulo | Single line text | |
| tema | Single line text | |
| partner | Single line text | Program Partner responsable |
| speaker | Single line text | |
| video_url_youtube | URL | YouTube unlisted |
| thumbnail_url | URL | 16:9 |
| insight_gratis | Long text | El que ve cualquier visitante |
| insight_bloqueado_1 | Long text | Solo alumni/inscritos |
| insight_bloqueado_2 | Long text | Solo alumni/inscritos |
| estado | Single select | Abierto / Exclusivo / Próximo |
| fecha | Date | |
| duracion_min | Number | Duración en minutos |
| orden | Number | |
| activa | Checkbox | |

---

## 8. `live_interviews`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| titulo | Single line text | |
| entrevistado_nombre | Single line text | |
| entrevistado_cargo | Single line text | |
| entrevistado_empresa | Single line text | |
| entrevistado_foto_url | URL | |
| tema | Single line text | |
| video_url_youtube | URL | YouTube unlisted |
| thumbnail_url | URL | 16:9 |
| aprendizaje_gratis | Long text | |
| aprendizaje_bloqueado_1 | Long text | |
| aprendizaje_bloqueado_2 | Long text | |
| estado | Single select | Abierto / Exclusivo / Próximo |
| fecha | Date | |
| duracion_min | Number | |
| orden | Number | |
| activa | Checkbox | |

---

## 9. `house_rules`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| titulo | Single line text | Nombre de la regla |
| descripcion | Long text | Explicación cultural, no legalista |
| icono | Single line text | Emoji o nombre de icono |
| categoria | Single select | Participación / Confidencialidad / Puntualidad / Give first / No spam / Preparación / Respeto / Ejecución |
| orden | Number | |
| activa | Checkbox | |

---

## 10. `rockstars`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| nombre | Single line text | |
| foto_url | URL | Cuadrada 1:1 |
| cargo | Single line text | |
| empresa | Single line text | |
| track_record_oneliner | Single line text | 1 línea de lo más impresionante |
| tipo | Single select | Rockstar / Partner / Speaker / Mentor / Investor / Founder |
| linkedin_url | URL | |
| tags | Multiple select | VC / Founder / Legal / Growth / Fundraising / Impact / Climate / Fintech / AI |
| confirmed_mf26 | Checkbox | Confirmado para esta edición |
| featured | Checkbox | Destacado general |
| featured_this_week | Checkbox | Drip campaign — solo 1-2 activos a la vez |
| orden | Number | |
| activa | Checkbox | |

**Nota drip campaign:** cada semana Maca/Lola marcan `featured_this_week=true` en 1-2 rockstars. El home y el topbar de /rockstars los destacan automáticamente. El resto de la semana quedan en false.

---

## 11. `qa`

| Campo | Tipo Airtable | Notas |
|---|---|---|
| pregunta | Single line text | |
| respuesta | Long text | Markdown OK |
| categoria | Single select | Programa / Logística / Pago / Selección / Post-programa |
| orden | Number | |
| activa | Checkbox | |
| source | Single select | existente / whatsapp / email |

**Registros iniciales:** las 25 preguntas del spec v3 §5.8 (15 existentes + 10 nuevas de modelo de pago). Owner: Nicole carga las que llegan por WhatsApp semanalmente.

---

## Checklist de creación

- [ ] home_metrics
- [ ] home_testimonios
- [ ] home_casos_exito
- [ ] home_logos_alumni
- [ ] home_logos_partners
- [ ] advisors
- [ ] masterclasses
- [ ] live_interviews
- [ ] house_rules
- [ ] rockstars
- [ ] qa
- [ ] Webhook Airtable → Vercel revalidate (para ISR automático al cambiar data)
