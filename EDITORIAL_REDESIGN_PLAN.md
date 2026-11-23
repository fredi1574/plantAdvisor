# FloraLog — Editorial Layout & Visual Hierarchy Plan

A focused plan to eliminate "card fatigue" on long screens by replacing stacked `SurfaceCard` boxes with editorial botanical layouts, clear visual hierarchy, and breathing room.

---

## 1. Plant Detail Notebook (`src/app/plant/[id].tsx`, `src/components/plant-detail/`)
**Problem:** Stacks 6 separate bordered cards vertically (`Hero` → `Growth Chart` → `Photo Gallery` → `Adaptive Care` → `Health Assessment` → `Care Log`), causing double padding and a mile-long scroll.

- [x] **Full-Bleed Edge-to-Edge Hero Photo:** Let the specimen photo bleed to the top and sides of the screen with a soft scrim, overlaid floating Back / Health Scan pills, and Fraunces title + species metadata directly below.
- [x] **Sliding Segmented Sub-Tabs (`Overview` · `Journal` · `Health`):** Match the Reanimated spring-driven sliding pill pattern from `FloatingTabBar` / `Scan`:
  - **Overview:** Quick-water bar, compact hairline-divided care specs strip, `VisualProgressGallery`, and `GrowthTrendChart`.
  - **Journal:** Quick care composer + unboxed chronological `CareLogSection` timeline directly on the canvas so entries breathe.
  - **Health:** `PlantHealthAssessmentCard` + `PlantAdaptiveCareCard` (climate & seasonal intelligence).

---

## 2. Profile & Settings (`src/app/(tabs)/profile.tsx`, `src/components/profile/`)
**Problem:** 5 bulky shadowed cards stacked vertically make settings feel heavy and slow to scan.

- [x] **Borderless Identity Header:** Render avatar, display name, email, and cloud sync status directly on the warm `bgPrimary` canvas with no outer card border.
- [x] **Inset Grouped Settings Rows:** Replace heavy cards with uppercase eyebrow section labels (`APPEARANCE`, `NOTIFICATIONS`, `DATA & ACCOUNT`) above flat, hairline-divided grouped rows with zero drop shadow.

---

## 3. Scan Screen (`src/app/(tabs)/scan.tsx`, `src/components/scan/`)
**Problem:** Step 1 (`PhotoCaptureCard`) and Step 2 (`IdentifyPlantFlow` / `HealthDiagnosisFlow`) are both boxed in cards with nested cards inside them.

- [x] **Unbox Input Steps:** Place the camera viewfinder, inputs, and symptom chips directly on the `bgPrimary` canvas separated by crisp Fraunces section headers and hairline dividers.
- [x] **Highlight AI Results:** Reserve elevated `SurfaceCard` containers specifically for **AI output payoffs** (species match card & `DiagnosisResultPanel`) so results stand out immediately.

---

## 4. My Garden & Care Schedule (`src/app/(tabs)/index.tsx`, `src/app/(tabs)/calendar.tsx`)
**Problem:** Controls and schedule lists compete visually with the primary content cards.

- [x] **Unbox `GardenControlsCard`:** Float the search bar and horizontal filter chips directly on the background canvas so the actual plant cards are the only elevated surfaces on My Garden.
- [x] **Editorial Care Schedule:** Keep the interactive month calendar in a soft container, and render the **Day Agenda** and **Upcoming Timeline** as open chronological lists with clean date headers instead of nested cards inside cards.
