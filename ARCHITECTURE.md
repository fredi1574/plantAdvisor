# FloraLog — Architecture Specification (`ARCHITECTURE.md`)

## 1. Overview
**FloraLog** is an offline-first, cross-platform (Android, iOS, Web) plant & succulent notebook and AI health advisor built with **Expo Managed Workflow (Continuous Native Generation)** and **Expo Router**, with bilingual **English & Russian (`i18n`)** support and Light/Dark ("Night Conservatory") themes.

---

## 2. Directory Structure

```text
plantAdvisor/
├── DESIGN.md                        # Botanical design system tokens & layout rules
├── ARCHITECTURE.md                  # System architecture, AI pipelines, and storage layer
├── app.json                         # Expo CNG configuration (photos, notifications, Google Sign-In, i18n)
├── supabase/
│   ├── schema.sql                   # PostgreSQL tables, FK indexes, RLS policies, AI quotas & Storage
│   └── functions/
│       ├── plant-ai/index.ts        # Deno Edge Function proxy for Gemini AI & daily scan quotas
│       └── delete-account/index.ts  # Self-service cloud account & storage deletion Edge Function
├── src/
│   ├── app/                         # Expo Router file-based navigation (thin screen orchestrators)
│   │   ├── _layout.tsx              # Root Stack navigator, font loading & notification deep linking
│   │   ├── auth.tsx                 # Botanical Sign In screen (Email + Google Sign-In)
│   │   ├── sign-up.tsx              # Create Account screen
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          # Floating glass tab bar (Garden, Schedule, Scan, Account)
│   │   │   ├── index.tsx            # "My Garden" virtualized FlatList (list/grid, search, filter, sort, rooms)
│   │   │   ├── calendar.tsx         # "Care Schedule" agenda & interactive month heatmap
│   │   │   ├── scan.tsx             # "Add / AI Scan" workflow (Identify or Health Diagnosis)
│   │   │   └── profile.tsx          # Gardener Profile, Theme, Language, Room Presets & Notifications
│   │   └── plant/[id].tsx           # Specimen Notebook, Analytics, Adaptive Care & AI Health
│   ├── components/
│   │   ├── ui/                      # Shared primitives (SurfaceCard, GlassCard, GlassPill, Chip,
│   │   │                            #   BotanicalInput, FeedbackBanner, ScreenHeader, StatusBadges,
│   │   │                            #   SwipeableRow, BottomSheetModal, PhotoLightboxModal, SwitchRow,
│   │   │                            #   BotanicalIllustrations, BotanicalShimmer, BotanicalBackground)
│   │   ├── auth/                    # AuthScreenShell & AuthIconInput
│   │   ├── calendar/                # CareScheduleView, DayAgendaCard & CareMonthCalendar
│   │   ├── garden/                  # GardenControlsCard, GardenEmptyState, SwipeablePlantCard,
│   │   │                            #   PlantGridCard, PlantStatusPhoto, PropagationReadinessBar, PetSafetyBadge
│   │   ├── modals/                  # OnboardingModal, EditPlantModal, EditLogModal, CareMetricsFields,
│   │   │                            #   AiLimitModal, DeleteAccountModal, LegalInfoModal
│   │   ├── plant-detail/            # PlantHeroCard, GrowthTrendChart, VisualProgressGallery, PlantAdaptiveCareCard,
│   │   │                            #   PlantHealthAssessmentCard (+ FollowUp & History), CareLogSection (+ Composer & SwipeableLogItem)
│   │   ├── profile/                 # GuestCloudCard, ProfileOverviewCard, AppearanceCard, NotificationsCard, RoomPresetsSection
│   │   └── scan/                    # PhotoCaptureCard, PlantSelectorField, IdentifyPlantFlow,
│   │                                #   HealthDiagnosisFlow (+ MultiAnglePicker & ResultPanel)
│   ├── constants/
│   │   ├── theme.ts                 # Light & Dark palettes, Cyrillic-aware font tokens, spacing & shadows
│   │   ├── plantOptions.ts          # Shared plant type, pot material, light & soil moisture option lists
│   │   └── seedData.ts              # Initial seeded conservatory specimens & timeline logs
│   ├── hooks/                       # use-theme, use-color-scheme, use-toast
│   ├── i18n/                        # i18next setup, en/ru locale bundles & plantDisplay helpers
│   ├── types/
│   │   └── plant.ts                 # Strict TypeScript domain models & AI schemas
│   ├── utils/
│   │   ├── watering.ts              # Pure watering countdown, date-key & default copy helpers
│   │   └── ids.ts                   # Collision-safe client entity ID generator
│   ├── services/
│   │   ├── ai/                      # Modular AI service (schemas, guardrails, quota, mockEngine, client)
│   │   ├── aiPlantService.ts        # Backwards-compatible barrel re-exporting `src/services/ai`
│   │   ├── supabase/                # Modular Supabase client, row mappers, storage, profiles & garden sync
│   │   ├── localAuthFallback.ts     # Offline AsyncStorage auth fallback for local dev without Supabase
│   │   ├── calendarUtils.ts         # Care schedule projections, month grid builder & monthly adherence
│   │   ├── careIntelligenceService.ts # Seasonal/container interval tuning, Open-Meteo city geocoding & weather advisories
│   │   ├── notificationService.ts   # On-device `expo-notifications` watering reminders & morning digest
│   │   ├── imagePicker.ts           # Unified camera/library picker + AI compression hook (`expo-image-picker`)
│   │   ├── imageUtils.ts            # Image compression/resizing (<=1024x1024 JPEG/WebP)
│   │   ├── dialogs.ts               # Cross-platform confirmation dialog helper
│   │   └── haptics.ts               # Safe haptic feedback wrappers
│   └── store/
│       ├── syncQueue.ts             # Offline pending-op queue coalescing & Supabase replay runner
│       ├── plantStoreTypes.ts       # Shared Zustand store state, slice & payload types
│       ├── slices/                  # Modular Zustand slices (plant, careLog, healthAssessment, preferences, sync)
│       ├── usePlantStore.ts         # Composed Zustand + AsyncStorage offline-first garden store
│       ├── useAuthStore.ts          # Supabase Auth, Google Sign-In & Gardener Profile store
│       ├── useLanguageStore.ts      # Persisted System / EN / RU language preference store
│       └── useThemeStore.ts         # Persisted Light / Dark / System theme preference store
```

---

## 3. Data Models (`src/types/plant.ts`)

1. **`SpeciesCatalog`**: Taxonomic profile (`commonName`, `scientificName`, `family`, `plantType`), baseline care (`idealLight`, `baseWateringDays`, `soilRecommendation`), `succulentGuardrails`, and `petSafety` toxicity warnings.
2. **`UserPlant`**: Specimen metadata (`id`, `nickname`, `species`, `location`, `hasDrainageHole`, `potMaterial`, `lastWateredAt`, `customWateringIntervalDays`, optional `fertilizeIntervalDays` & `rotateIntervalDays`, `latestHealthAssessment`).
3. **`NotebookEntry`**: Chronological log tied to a `plantId` (`eventType`, `timestamp`, `title`, `notes`, `photoUri`, `metrics`).
4. **`HealthAssessment`**: Structured output from `diagnosePlantHealth` (`healthStatus`, `detectedSymptoms[]`, `diagnosisSummary`, `followUpQuestions[]`, checkable `recommendedActions[]`, and `adjustedWateringIntervalDays`).

---

## 4. AI Service Layer (`src/services/ai/`)

- **Mock Mode (`EXPO_PUBLIC_USE_MOCK_AI=true` or unconfigured Supabase)**: Deterministic botanical engine in `mockEngine.ts` with local daily quota tracking (`quota.ts`).
- **Server-Side Proxy Mode (Exclusive live AI path)**: Requires a signed-in Supabase session, prepares `<= 1024px` images via `imageUtils.ts`, and calls the `plant-ai` Supabase Edge Function, which enforces atomic per-user daily quotas (`consume_ai_scan_quota`), passes `GEMINI_API_KEY` via server-side headers (`x-goog-api-key`), localizes AI prose to the active `en`/`ru` locale, and keeps all AI credentials off the client.
- **Succulent Guardrails (`guardrails.ts`)**: Enforced post-processing for `Crassulaceae`, `Cactaceae`, `Asphodelaceae`, `Aizoaceae`, and `Agavaceae` — blocks misting/shallow watering instructions, enforces a minimum 12-day Soak-and-Dry interval, and prepends immediate warnings for pots lacking drainage holes.

---

## 5. Offline-First State & Supabase Sync (`src/store/`, `src/services/supabase/`)

- `usePlantStore` persists plants, care logs, assessments, pending sync operations, notification preferences, room presets, and adaptive care settings via AsyncStorage.
- Mutations immediately update local state, enqueue coalesced operations in `syncQueue.ts`, reschedule on-device reminders, and flush to Supabase in the background (and again when returning to foreground).
- Storage uploads are scoped under `${auth.uid()}/${plantId}/...` and enforced via per-user folder RLS policies in `supabase/schema.sql`.
