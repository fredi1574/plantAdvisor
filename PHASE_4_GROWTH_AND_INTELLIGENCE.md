# Phase 4: Growth Analytics, Botanical Intelligence & Automated Testing

**Goal:** Add differentiating botanical intelligence (growth charts, pet toxicity safety, multi-angle diagnostics, weather/light awareness) and establish an automated test suite for long-term reliability.

---

## 1. Propagation & Growth Visualization

- [x] **Growth Trend Charts on [src/app/plant/[id].tsx](file:///c:/Users/fredi/Desktop/plantAdvisor/src/app/plant/[id].tsx)**:
  - Plot `rootLengthCm`, `stemHeightCm`, and `leafCount` from `NotebookEntry.metrics` over time using `react-native-svg` (already installed in [package.json](file:///c:/Users/fredi/Desktop/plantAdvisor/package.json)).
  - For propagations, show a milestone readiness indicator (e.g., *"Taproot 9.5 / 10 cm — almost ready for soil transition"*).
- [x] **Visual Progress Gallery**:
  - Aggregate all `photoUri` entries from `NotebookEntry[]` and `HealthAssessment[]` for a plant into a chronological photo strip / before-and-after comparison view.

---

## 2. Botanical Safety & Multi-Photo AI Diagnostics

- [x] **Pet & Child Toxicity Warnings**:
  - Extend `SpeciesCatalog` and `PlantIdentificationResult` in [src/types/plant.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/types/plant.ts) with `petSafety` (`isToxicToCats`, `isToxicToDogs`, `toxicityLevel`, `toxicPrinciples`, `safetyNotes`).
  - Update `PLANT_IDENTIFICATION_JSON_SCHEMA` and mock catalog in [src/services/aiPlantService.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/services/aiPlantService.ts).
  - Display high-contrast pet-safety badges on the identification result card and specimen detail header.
- [x] **Multi-Angle Diagnostic Scans**:
  - Allow attaching up to 3 labeled photos in `diagnose` mode on [src/app/(tabs)/scan.tsx](file:///c:/Users/fredi/Desktop/plantAdvisor/src/app/(tabs)/scan.tsx):
    1. *Whole Plant / Canopy*
    2. *Leaf / Stem Close-Up*
    3. *Soil Surface & Pot Base*
  - Bundle all prepared base64 images into the Gemini multimodal request for higher-accuracy root-rot vs. pest vs. light-stress diagnoses.

---

## 3. Adaptive Care Intelligence

- [x] **Seasonal & Pot-Material Interval Tuning**:
  - Factor in hemisphere/season (dormancy dry-back in winter vs. active growth in spring/summer), `potMaterial` (`terracotta` dries faster than `ceramic_glazed` or `plastic_nursery`), and `isIndoor` when suggesting `customWateringIntervalDays`.
- [x] **Optional Weather-Adaptive Alerts (Open-Meteo)**:
  - For outdoor plants (`isIndoor === false`), fetch free forecast data from Open-Meteo (no API key required) to suggest pushing watering back after heavy rain or trigger urgent frost alerts when temperatures drop below 3°C / 37°F.

---

## 4. Automated Test Suite & Release Readiness

- [x] **Set up Jest / `jest-expo` + React Native Testing Library**:
  - Add unit tests for:
    - `enforceSucculentDiagnosisGuardrails` and `isSucculentTaxon` in [src/services/aiPlantService.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/services/aiPlantService.ts)
    - `getDaysUntilNextWater`, `doesPlantNeedWatering`, and store mutations in [src/store/usePlantStore.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/store/usePlantStore.ts)
    - `getProjectedCareEvents` and `getHistoricalCareEvents` in [src/services/calendarUtils.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/services/calendarUtils.ts)
    - `computePlantReminderDate` in [src/services/notificationService.ts](file:///c:/Users/fredi/Desktop/plantAdvisor/src/services/notificationService.ts)
- [x] **CI Workflow**:
  - Add a GitHub Actions workflow running `npx tsc --noEmit`, `npx expo lint`, and the test suite on every push/PR.
- [ ] **EAS Build Verification**:
  - Verify `development` and `preview` builds via [eas.json](file:///c:/Users/fredi/Desktop/plantAdvisor/eas.json) on Android/iOS physical devices (especially `expo-notifications`, `expo-camera`, and `expo-blur` / `expo-glass-effect`).

---

## Verification Checklist
- [x] All unit tests pass (`npm test` / `jest`)
- [x] `npx tsc --noEmit` and `npx expo lint` pass with 0 errors
- [ ] Preview APK/IPA tested on device for camera, notifications, and dark/light glass effects
