# FloraLog — Next Improvements Roadmap (`NEXT_IMPROVEMENTS.md`)

A focused handoff guide of the highest-impact visual, UX, and release-readiness improvements to tackle next.

---

## 1. Visual & Animation Polish (Remaining Screens)

### A. Scan Screen & Camera Viewfinder (`src/app/(tabs)/scan.tsx`, `src/components/scan/`)
- **Sliding Mode Switcher Pill:** Replace the static `Identify Plant` / `Health Scan` toggle with an animated sliding pill indicator matching `FloatingTabBar` in `src/app/(tabs)/_layout.tsx`.
- **Botanical Viewfinder Framing:** Add subtle corner-bracket overlays inside `PhotoCaptureCard` to give the capture frame a purposeful camera-viewfinder feel.
- **Tactile Controls:** Convert camera/gallery capture buttons and primary scan CTAs to `SpringPressable`.

### B. Care Log Timeline & Botanical SVG Empty States (`src/components/plant-detail/care-log-section.tsx`, `src/components/garden/garden-empty-state.tsx`)
- **Chronological Care Timeline Rhythm:** Refine the vertical rail and color-coded event nodes in `CareLogSection`, wrap log items in `AnimatedEntrance` (`animateLayout`), and polish inline log photo thumbnails.
- **Custom Botanical SVG Line-Art Empty States:** Replace generic Lucide icons in `GardenEmptyState` and empty care-log placeholders with lightweight `react-native-svg` botanical illustrations (potted succulent / sprout line art) that adapt to Light and Dark (`Night Conservatory`) palettes.

---

## 2. Botanical UX Enhancements

- **Watering Undo Toast (`src/hooks/use-toast.ts`, `src/store/slices/careLogSlice.ts`):**
  - Add an optional **Undo** action to `FeedbackBanner` / `useToast` when tapping quick-water or *"Water All"* so accidental taps can be reversed immediately (restoring `lastWateredAt` and removing the newly created care entry).
- **Room Presets (`src/store/`, `src/components/scan/identify-plant-flow.tsx`):**
  - Save reusable Room / Spot profiles (e.g., *South Living Room Sill — Bright Direct, Indoor*) so adding new plants auto-fills exposure and indoor/outdoor defaults.
- **Propagation Bench View (`src/app/(tabs)/index.tsx`):**
  - When filtering by `Props` (`plantType === 'propagation'`), surface a root-length readiness progress indicator using the latest `NotebookEntry.metrics.rootLengthCm`.

---

## 3. Production & Store Release Readiness

- **In-App Account Deletion:** Add a confirmed self-service account deletion flow in `Profile` (via a Supabase Edge Function using `service_role` or `auth.admin.deleteUser`) — required for Apple App Store & Google Play compliance.
- **EAS Build & Device Verification (`PHASE_4_GROWTH_AND_INTELLIGENCE.md`):**
  - Run `eas build --profile preview` for Android/iOS and verify on physical devices:
    - `expo-camera` / `expo-image-picker` permissions & photo upload to `plant-photos`
    - `expo-notifications` local reminders & daily digest scheduling
    - `expo-blur` / `expo-glass-effect` floating tab bar & Fraunces typography rendering in both Light and Dark themes
- **Security Follow-Up:** Rotate the old Gemini API key in Google AI Studio and update `GEMINI_API_KEY` in Supabase Edge Function Secrets before public distribution.
