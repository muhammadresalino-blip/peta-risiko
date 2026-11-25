# PetaRisiko UI Design System

## Identity
Corporate Navy & Teal: an editorial, restrained enterprise interface for risk management. The design prioritizes legibility, structured data, and operational clarity.

## Tokens
| Token | Value | Use |
|---|---|---|
| Navy 900 | `#142D4E` | Sidebar, primary actions, headings |
| Navy 700 | `#244C70` | Secondary navy, hover |
| Teal 600 | `#168C87` | Active navigation, accent actions, selected data |
| Teal 50 | `#E9F4F2` | Soft accent surfaces |
| Canvas | `#F5F7FA` | App background |
| Surface | `#FFFFFF` | Cards, forms, tables |
| Border | `#E5EAF0` | Dividers and outlines |
| Ink | `#1D2939` | Primary text |
| Muted | `#66758A` | Secondary text |

## Typography
- Manrope: headings and key metric values.
- DM Sans: body, labels, controls, and navigation.
- JetBrains Mono: risk identifiers, scores, and numeric values.
- Page title: 28–30px / 700; section title: 14–20px / 600–700; body: 14px / 400; labels: 11–13px / 600; captions: 10–12px.

## Controls
- Primary: navy filled; use for one main action per page.
- Secondary: white with subtle border.
- Accent: teal filled; use for workflow-forward actions.
- Destructive: white/red outline; reserve for delete or irreversible actions.
- Standard control height: 38–40px; compact controls: 32px; icon controls: 36px.
- Focus ring: 3px teal at low opacity; disabled controls must visibly communicate disabled state.

## Data components
- Risk badges always include text: Low, Medium, High, Extreme High.
- Workflow badges: Draft, Diajukan, Aktif, Retired.
- Risk tables use light gray headers, compact rows, right-aligned numeric fields, and a visible hover state.
- Heat Map is a 5×5 matrix with probability on the vertical axis and impact on the horizontal axis. Provide Inherent/Residual switching and a text legend.
- Metric cards use one clear metric, concise context, and a restrained icon container.

## Layout
- Desktop: 252px navy sidebar + sticky white topbar + light canvas content.
- Tablet: narrower navigation and two-column metric layouts.
- Mobile: collapsible navigation, single-column content, horizontally scrollable data tables.
- Cards: white, 1px border, 12px radius, subtle shadow; avoid decorative gradients.

## Page inventory
Login; Dashboard; Risk Register; Risk Detail; Create/Edit Risk; Heat Map; Risk Appetite; Import & Export; Users & Units; Settings; Audit Log.

## Interaction and accessibility
Use 150–200ms transitions for hover/focus only. Provide visible keyboard focus, semantic button labels, form labels, empty states, and clear validation. Never rely on color alone for risk levels.
