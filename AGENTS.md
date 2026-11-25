# OpenCode instructions — PetaRisiko

You are working on the PetaRisiko risk-management web application. Follow these project rules before editing code.

## Product context
- Product: PetaRisiko, a multi-organization risk register and risk intelligence application.
- Language: Indonesian for user-facing UI.
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS v4, Lucide icons, Prisma 7, PostgreSQL/Neon. Recharts is available for charts.
- Current project is a UI starter with demo/local state. Do not claim database persistence, authentication, RBAC enforcement, approval workflow, Excel processing, or audit persistence are implemented unless you implement and test them.

## Visual direction
- Design: Corporate Navy & Teal, professional enterprise risk-management UI.
- Navy 900: `#142D4E`; Navy 700: `#244C70`; Teal 600: `#168C87`; Teal 50: `#E9F4F2`.
- Canvas: `#F5F7FA`; surface: `#FFFFFF`; border: `#E5EAF0`; text: `#1D2939`; muted: `#66758A`.
- Risk colors: Low `#23865A`; Medium `#B7791F`; High `#D36B32`; Extreme High `#C43D4D`.
- Typography: Manrope for headings, DM Sans for body/UI, JetBrains Mono for risk IDs and numeric data.
- Sidebar is deep navy with teal active state. Main workspace is light. Cards use subtle borders and restrained shadows, 8–12px radius.
- Avoid gradients, glassmorphism, oversized decoration, excessive pills, and generic AI-dashboard styling.
- Always show risk level text as well as color. Maintain visible keyboard focus and accessible labels.
- Responsive behavior must support desktop, tablet, and mobile.

## Product pages / navigation
Maintain consistent navigation and shared components across:
1. Login
2. Dashboard
3. Risk Register
4. Risk Detail
5. Create/Edit Risk
6. Heat Map 5×5 (Inherent and Residual)
7. Risk Appetite (category and unit)
8. Import & Export
9. User and Unit administration
10. Organization settings (BTR, probability mapping, risk-level thresholds)
11. Audit Log

## Business rules from the product brief
- Risk score = probability × impact, each from 1 to 5.
- Default risk levels: 1–3 Low, 4–6 Medium, 8–12 High, 15–25 Extreme High. Keep thresholds configurable; do not silently invent a category for missing ranges.
- Residual score must not exceed inherent score; show validation/warning if it does.
- Net value = probability percentage × financial impact.
- Risk Appetite is exceeded when residual score is greater than the configured appetite threshold for its category or unit.
- Workflow statuses: Draft → Submitted → Active → Retired.
- Roles: Admin, Risk Owner, Reviewer, Viewer; Platform Admin manages organizations and should not automatically see tenant risk data.
- All business data must be scoped by organization on the server once backend services are implemented. Never trust an `orgId` sent by the browser.
- The Cakrawala Nusantara Air dataset is fictitious demo data, not hard-coded production configuration. Organization-specific units, categories, BTR, probabilities, and appetite must be configurable.
- Values such as probability percentages and BTR must be labeled as example/default until approved by the organization.

## Engineering rules
- Prefer reusable components in `src/components/ui`, `src/components/layout`, and feature folders as the project grows.
- Keep calculations in `src/lib/scoring.ts`, not duplicated inside UI components.
- Validate user input with Zod. Server actions/route handlers must enforce authorization and tenant scope.
- Do not mark placeholder controls as functional. Either implement the action or show a disabled/coming-soon state with an honest explanation.
- Preserve existing working local interactions unless a change is requested.
- Keep TypeScript strict; avoid `any` where practical.
- Before finishing, run `npm run typecheck` and `npm run build`. Report any checks that could not be run and why.

## First task when opening this project
1. Read `README.md`, `docs/design-system.md`, and `PetaRisiko Dokumen Produk dan Teknis.md` if present.
2. Inspect the existing routes and components before replacing them.
3. Use `design/reference-board.png` as a visual reference only; do not use the poster as a page background or screenshot asset in the app.
4. Implement page-by-page, reusing the same tokens, navigation, controls, tables, badges, and spacing system.
