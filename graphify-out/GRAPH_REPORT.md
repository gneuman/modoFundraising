# Graph Report - .  (2026-04-29)

## Corpus Check
- 128 files · ~70,903 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 353 nodes · 450 edges · 29 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `obtenerSesion()` - 23 edges
2. `email()` - 12 edges
3. `h1()` - 12 edges
4. `p()` - 12 edges
5. `small()` - 12 edges
6. `divider()` - 12 edges
7. `getAllApplications()` - 11 edges
8. `sendCouponLink()` - 10 edges
9. `POST()` - 9 edges
10. `sendAdmissionEmail()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `assignCouponToApplication()`  [INFERRED]
  src\app\api\admin\applications\route.ts → src\lib\airtable.ts
- `Public Logo MF Azul` --semantically_similar_to--> `Logo Modo Fundraising 2026 — Azul`  [INFERRED] [semantically similar]
  public/logo-mf-azul.png → docs/brandData/Logo_ModoFundraising2026-Azul (1).png
- `Public Favicon PNG` --semantically_similar_to--> `Favicon Oscuro (rocket isotipo, dark navy)`  [INFERRED] [semantically similar]
  public/favicon.png → docs/brandData/MODO_FUNDRAISING_2026 - FAVICON OSCURO.png
- `AdminLayout()` --calls--> `obtenerSesion()`  [INFERRED]
  src\app\admin\layout.tsx → src\lib\auth.ts
- `AdminClasesPage()` --calls--> `getClasesWithContent()`  [INFERRED]
  src\app\admin\clases\page.tsx → src\lib\airtable.ts

## Hyperedges (group relationships)
- **Modo Fundraising 2026 Brand System** — brand_identity, brand_colors_pdf, logo_azul, logo_blanco, rocket_isotipo [INFERRED 0.90]
- **Modo Fundraising Payment System** — stripe_service, stripe_product_mensual, stripe_product_unico, stripe_webhook, setup_stripe_doc [EXTRACTED 1.00]
- **IFSP Six Value Propositions** — value_prop_comunidad, value_prop_conocimiento, value_prop_crecimiento, value_prop_networking, value_prop_reconocimiento, value_prop_visibilidad, ifsp_program [INFERRED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (29): POST(), GET(), POST(), PUT(), CuponesPage(), activateAllFoundersForApplication(), createCouponRecord(), createPagoRecord() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (21): POST(), AdminClasesPage(), DashboardPage(), assignCouponToApplication(), countFoundersInscritos(), createApplication(), createAsistencia(), createFounderRecord() (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (23): AdminLayout(), GET(), GET(), PATCH(), POST(), GET(), EquipoPage(), POST() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (14): GET(), getFounderByEmail(), crearSesion(), crearTokenMagic(), crearTokenSesion(), destruirSesion(), esAdmin(), getSecretoMagic() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.47
Nodes (19): PATCH(), badge(), btn(), divider(), email(), h1(), p(), sendAdmissionEmail() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (17): Icon: Comunidad (Community), Icon: Conocimiento (Knowledge), Icon: Crecimiento (Growth), Icon: Networking, Icon: Reconocimiento (Recognition), Icon: Visibilidad (Visibility), IFSP Logo, IFSP: Impacta Fundraising Strategy Program (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (3): applyStatus(), marcarSinRespuesta(), moveCard()

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (8): findNextQIdx(), getDisplayText(), handleNext(), handleSkip(), saveToStorage(), submitForm(), uploadLogo(), validateField()

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (2): onSubmit(), uploadLogo()

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (6): Next.js Agent Rules, CLAUDE.md Project Config, Geist Font Family, Next.js Framework, Modo Fundraising Next.js Project, Vercel Platform

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (6): Modo Fundraising 2026 Color Palette, Modo Fundraising 2026 Brand Identity, Logo Modo Fundraising 2026 — Azul, Logo Modo Fundraising 2026 — Blanco, Public Logo MF Azul, Brand Assets Setup Guide

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (5): Stripe Setup Guide, Stripe Product — Suscripción Mensual, Stripe Product — Pago Único, Stripe Payment Service, Stripe Webhook Endpoint

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): addDaysSantiago(), toSantiagoInput()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (4): Favicon Blanco (rocket isotipo, white), Favicon Oscuro (rocket isotipo, dark navy), Public Favicon PNG, Rocket Isotipo — Brand Visual Symbol

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Color Dark Navy #181b2f

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Color Hot Pink #e5007e

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Color Magenta #e217cf

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Color Violet #991de4

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Color Purple #572583

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Color Red-Orange #e64915

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Color Orange #ea680f

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Public Logo MF

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): HL-1: Partnership / Handshake Highlight

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): HL-2: Strategy Framework Highlight

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): HL-3: Innovation / Intelligence Highlight

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): HL-4: Recognition / Leadership Highlight

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): Master Logo modoFundraising Wordmark

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Obj-C: Talent / People Search

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Obj-D: Global Impact

## Knowledge Gaps
- **38 isolated node(s):** `CLAUDE.md Project Config`, `Vercel Platform`, `Brand Assets Setup Guide`, `Stripe Payment Service`, `Stripe Product — Suscripción Mensual` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (6 nodes): `nextStep()`, `onSubmit()`, `prevStep()`, `setLogoFile()`, `uploadLogo()`, `application-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `addDaysSantiago()`, `santiagoInputToISO()`, `toSantiagoInput()`, `timezone.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Color Dark Navy #181b2f`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Color Hot Pink #e5007e`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Color Magenta #e217cf`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Color Violet #991de4`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Color Purple #572583`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Color Red-Orange #e64915`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Color Orange #ea680f`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Public Logo MF`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `HL-1: Partnership / Handshake Highlight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `HL-2: Strategy Framework Highlight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `HL-3: Innovation / Intelligence Highlight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `HL-4: Recognition / Leadership Highlight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `Master Logo modoFundraising Wordmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Obj-C: Talent / People Search`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Obj-D: Global Impact`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `obtenerSesion()` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `getAllApplications()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `obtenerSesion()` (e.g. with `AdminLayout()` and `GET()`) actually correct?**
  _`obtenerSesion()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CLAUDE.md Project Config`, `Vercel Platform`, `Brand Assets Setup Guide` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._