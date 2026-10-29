# FloraLog — Botanical Design System (`DESIGN.md`)

FloraLog uses an earthy, calm, tactile botanical visual language designed for clarity outdoors and indoors across Android, iOS, and Web. It pairs warm parchment surfaces with deep forest greens, terracotta accents, and high-contrast health badges.

---

## 1. Color Palette

### Core Surfaces & Backgrounds
| Token | Hex | Role |
| :--- | :--- | :--- |
| `bgPrimary` | `#F7F5F0` | Warm parchment / alabaster canvas background |
| `bgSurface` | `#FFFFFF` | Elevated card surface |
| `bgSubtle` | `#EFECE4` | Muted botanical stone for chips, secondary containers, and timeline rails |
| `bgElevated` | `#E6E1D5` | Interactive hover / pressed surface state and dividers |
| `borderSubtle` | `#DDD7C8` | Hairline card and input borders (`1px`) |

### Botanical Brand & Accent Colors
| Token | Hex | Role |
| :--- | :--- | :--- |
| `primary` | `#2D5A3C` | Deep Forest Sage — primary actions, active tabs, headers |
| `primarySoft` | `#E3EFE6` | Soft Sage tint — subtle badges, selected pills, icon backdrops |
| `primaryMuted` | `#4E7A5B` | Secondary botanical green for icons and metadata |
| `accentTerracotta` | `#C86D51` | Terracotta Clay — primary secondary CTA, pot/soil highlights, propagation milestones |
| `accentTerracottaSoft` | `#F9EBE6` | Soft Terracotta surface tint |
| `waterBlue` | `#2E7D9B` | Hydration Blue — watering actions, countdown badges, moisture logs |
| `waterBlueSoft` | `#E4F2F7` | Soft Hydration surface tint |

### Typography Colors
| Token | Hex | Contrast on `#F7F5F0` | Role |
| :--- | :--- | :--- | :--- |
| `textPrimary` | `#1C2820` | 14.2:1 (AAA) | Primary titles, body copy, plant names |
| `textSecondary` | `#526056` | 6.1:1 (AA) | Scientific names, timestamps, care metadata |
| `textMuted` | `#7A877D` | 3.7:1 | Placeholders, disabled labels, subtle captions |
| `textInverse` | `#FFFFFF` | — | Text on primary forest or terracotta buttons |

### High-Contrast Plant Health & Urgency Badges
Designed for immediate scannability in bright sunlight:

| Status / Urgency | Text / Icon Hex | Background Hex | Border Hex | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Thriving** (`thriving`) | `#14532D` | `#DCFCE7` | `#86EFAC` | Healthy growth, turgid leaves, on-schedule hydration |
| **Needs Attention** (`needs_attention`) | `#7C2D12` | `#FEF3C7` | `#FCD34D` | Mild stress, etiolation, overdue water, or subtle leaf spotting |
| **Critical** (`critical`) | `#7F1D1D` | `#FEE2E2` | `#FCA5A5` | Root rot risk, severe overwatering, active pest infestation |
| **Needs Watering** | `#0C4A6E` | `#E0F2FE` | `#7DD3FC` | Next water countdown `<= 0` days |

---

## 2. Typography Scale

FloraLog uses clean system geometric sans-serif for UI density, paired with italic styling for botanical binomial nomenclature (`Crassula ovata`, `Persea americana`).

| Token | Size (`px`) | Line Height (`px`) | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `display` | `28` | `34` | `700` | Screen headers ("My Garden", Plant Detail title) |
| `h1` | `22` | `28` | `700` | Section titles, modal headers |
| `h2` | `18` | `24` | `600` | Plant Card title, AI Diagnosis header |
| `h3` | `15` | `20` | `600` | Sub-section headers, timeline event titles |
| `body` | `15` | `22` | `400` | Notebook notes, diagnosis explanations, care guidance |
| `bodyMedium` | `15` | `22` | `500` | Checkable action items, form inputs |
| `caption` | `13` | `18` | `500` | Metadata chips, scientific names (italic), dates |
| `micro` | `11` | `14` | `700` | Uppercase status badges (`letterSpacing: 0.6`) |

---

## 3. Spacing, Radius & Elevation

- **Spacing Scale (`4px` base)**:
  - `xs`: `4px`
  - `sm`: `8px`
  - `md`: `12px`
  - `lg`: `16px`
  - `xl`: `24px`
  - `xxl`: `32px`
- **Border Radius**:
  - `sm`: `8px` (status badges, small chips)
  - `md`: `12px` (buttons, inputs, action checkboxes)
  - `lg`: `16px` (standard plant & timeline cards)
  - `xl`: `22px` (hero summary cards, scan viewfinder frame)
  - `full`: `9999px` (pill filters, circular icon buttons)
- **Shadows**:
  - Soft warm elevation (`shadowColor: '#1C2820'`, `shadowOpacity: 0.06`, `shadowRadius: 10`, `shadowOffset: { width: 0, height: 4 }`, `elevation: 2`) paired with a crisp `1px` `#DDD7C8` border so cards stay well-defined on both Web and mobile.

---

## 4. Card & Component Layout Rules

1. **Garden Plant Card (`src/app/(tabs)/index.tsx`)**:
   - Horizontal split layout with a `76x76` rounded botanical thumbnail (`borderRadius: 14`), common name (`h2`), italic scientific name (`caption`), and a top-right high-contrast **Health Status Badge**.
   - Footer strip displays **Location Pill**, **Plant Type Pill** (`Succulent`, `Propagation`, etc.), and a dynamic **Hydration Indicator** ("Needs Water Today", "Overdue by 2d", or "Water in 9d").
2. **AI Health Assessment Card (`src/app/plant/[id].tsx`)**:
   - Top banner shows the AI status badge, assessment date, and adjusted watering interval recommendation.
   - Displays **Succulent Guardrail Callout** when the plant is in `Crassulaceae`/`Cactaceae` (e.g., warning against misting and requiring full soil dry-back).
   - Interactive **Recommended Next Steps** list where each item has an urgency pill (`immediate` | `soon` | `routine`) and a tap-to-toggle checkbox persisted in state.
3. **Chronological Notebook Timeline (`src/app/plant/[id].tsx`)**:
   - Left vertical rail (`2px` `#DDD7C8`) with color-coded circular event nodes (Hydration Blue for `water`, Terracotta for `propagate`/`repot`, Forest Sage for `prune`/`fertilize`/`note`/`ai_scan`).
   - Quick-action bar at the top of the timeline lets users log a Care Event in one tap or with custom notes/measurements.
4. **Responsive Web & Mobile Container**:
   - Screens center content within a `maxWidth: 760px` container on larger viewports while remaining full-bleed on phones.

