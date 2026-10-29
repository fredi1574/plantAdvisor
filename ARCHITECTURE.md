# FloraLog — Architecture Specification (`ARCHITECTURE.md`)

## 1. Overview
**FloraLog** is an offline-first, cross-platform (Android, iOS, Web) plant & succulent notebook and AI health advisor built with **Expo Managed Workflow (Continuous Native Generation)** and **Expo Router**.

---

## 2. Directory Structure

```text
plantAdvisor/
├── DESIGN.md                        # Botanical design system tokens & layout rules
├── ARCHITECTURE.md                  # System architecture, AI pipelines, and storage layer
├── app.json                         # Expo CNG configuration (camera & photo permissions)
├── src/
│   ├── app/                         # Expo Router file-based navigation
│   │   ├── _layout.tsx              # Root Stack navigator (Tabs + Plant Detail route)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          # Bottom Tab navigator ("My Garden" & "Add / AI Scan")
│   │   │   ├── index.tsx            # "My Garden" dashboard with filters & watering alerts
│   │   │   └── scan.tsx             # "Add / AI Scan" flow (Identify new plant or Diagnose existing)
│   │   └── plant/
│   │       └── [id].tsx             # Individual Plant Notebook & AI Health Assessment screen
│   ├── constants/
│   │   ├── theme.ts                 # Botanical color palette, typography, spacing tokens
│   │   └── seedData.ts              # Initial seeded plants (Jade Plant & Avocado Propagation)
│   ├── types/
│   │   └── plant.ts                 # Strict TypeScript domain models & AI schemas
│   ├── services/
│   │   ├── imageUtils.ts            # Image compression/resizing (<=1024x1024 JPEG/WebP)
│   │   └── aiPlantService.ts        # Mock + Live Gemini Multimodal AI service with Succulent Guardrails
│   └── store/
│       └── usePlantStore.ts         # Zustand + AsyncStorage offline-first repository store
```

---

## 3. Data Models (`src/types/plant.ts`)

1. **`SpeciesCatalog`**:
   - Stores taxonomic profile (`commonName`, `scientificName`, `family`, `plantType`), baseline care (`idealLight`, `baseWateringDays`, `soilRecommendation`), and `succulentGuardrails` (enforced for `Crassulaceae`, `Cactaceae`, etc.).
2. **`UserPlant`**:
   - Represents an individual specimen in the user's garden (`id`, `nickname`, `species`, `location`, `hasDrainageHole`, `potMaterial`, `lastWateredAt`, `customWateringIntervalDays`, `latestHealthAssessment`).
3. **`NotebookEntry`**:
   - Chronological log item tied to a `plantId` (`eventType`: `'water' | 'fertilize' | 'repot' | 'prune' | 'propagation' | 'note' | 'ai_scan'`, `timestamp`, `title`, `notes`, `photoUri`, `metrics`).
4. **`HealthAssessment`**:
   - Structured output from `diagnosePlantHealth`: `healthStatus`, `detectedSymptoms[]`, `diagnosisSummary`, `followUpQuestions[]`, `recommendedActions[]` (with checkable `completed` state and `urgency`), and `adjustedWateringIntervalDays`.

---

## 4. AI Service Layer (`src/services/aiPlantService.ts`)

### Environment Toggle
- Controlled via `EXPO_PUBLIC_USE_MOCK_AI` (defaults to `'true'` when no `EXPO_PUBLIC_GEMINI_API_KEY` is provided).
- **Mock Mode**: Deterministic, domain-accurate botanical engine that recognizes succulents (e.g., Jade Plant / `Crassula ovata`, Echeveria, Aloe), propagations (e.g., Avocado seed / `Persea americana`), and foliage plants, cross-referencing recent watering logs and pot drainage to detect overwatering, etiolation, or root-rot risk.
- **Live Multimodal LLM Mode**: Uses `expo-image-manipulator` (`src/services/imageUtils.ts`) to resize and compress photos to `<= 1024x1024` and calls the Google Gemini Multimodal REST endpoint (`gemini-2.5-flash`) with `responseMimeType: "application/json"` and strict system guardrails.

### Succulent-Specific Prompt Guardrails
- For `plantType === 'succulent'` or families `Crassulaceae`, `Cactaceae`, `Asphodelaceae`, and `Aizoaceae`, the prompt and post-processor enforce:
  - **Never recommend misting foliage** (promotes rot and fungal leaf spot on fleshy leaves).
  - **Never recommend frequent shallow sips of water**; always prescribe the **"Soak and Dry"** method (water deeply only when 100% of the soil column has dried out and lower leaves show slight softening).
  - **Flag non-draining pots** (`hasDrainageHole === false`) as an immediate high-priority risk.

---

## 5. Offline-First State & Phase 3 Supabase Readiness
- `usePlantStore` (`src/store/usePlantStore.ts`) uses **Zustand** persisted via `@react-native-async-storage/async-storage`.
- All mutations (`addPlant`, `logCareEvent`, `saveHealthAssessment`, `toggleActionItem`, `waterPlantNow`, `resetToSeedData`) use clean entity IDs and ISO-8601 timestamps so they map 1:1 to PostgreSQL tables (`species_catalog`, `user_plants`, `notebook_entries`, `health_assessments`) when Supabase sync is enabled in Phase 3.

