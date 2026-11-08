# FloraLog Feature Roadmap & Implementation Plan

This plan outlines the next phase of development for **FloraLog**, taking it from the current functional MVP (Zustand offline storage, Supabase authentication, Gemini multimodal diagnostics) to a feature-rich, high-retention botanical companion app.

---

## 1. Local Care Notifications (`expo-notifications`) — ✅ COMPLETED

### Objective
Ensure users never forget to water or care for their plants, boosting Day-7 and Day-30 retention through timely, non-intrusive local reminders.

### Technical Architecture
- **Library**: `expo-notifications` (SDK 58 compatible).
- **Strategy**: **Local Notification Scheduling** (runs 100% on-device, requiring no external push service or token management).
- **Trigger**: Every time a plant is added, watered, or its schedule is edited, the store re-computes its next due date and schedules/updates the corresponding notification.

### Implementation Status
- [x] **Dependency Installation & Configuration**:
  - Installed `expo-notifications` (`~58.0.21`).
  - Configured `app.json` plugin with icon and botanical accent color (`#2D5A3C`).
- [x] **Notification Service (`src/services/notificationService.ts`)**:
  - `requestNotificationPermissions()` & `getNotificationPermissionStatus()`: Implemented with permission checks and web fallback.
  - `schedulePlantWateringReminder(plant: UserPlant)`: Scheduled based on individual plant intervals at preferred reminder hour with custom copy for succulents, propagations, and foliage.
  - `cancelPlantReminder(plantId: string)`: Cancels notifications when plants are deleted or watered.
  - `scheduleDailyGardenDigest(plants: UserPlant[])`: Daily morning summary at preferred hour.
  - `sendTestCareNotification()`: Quick 2s test notification for user verification.
- [x] **Store Integration (`src/store/usePlantStore.ts`)**:
  - Integrated into `waterPlantNow`, `waterAllNeedingWater`, `waterAllPlants`, `addPlant`, `updatePlant`, `deletePlant`, and `syncWithSupabase`.
  - Reschedules on store rehydration and user preference updates.
- [x] **User Preferences (Settings / Profile Tab - `src/app/(tabs)/profile.tsx`)**:
  - Toggle notifications on/off.
  - Toggle daily morning digest on/off.
  - Preferred reminder time picker (07:00 AM, 09:00 AM, 12:00 PM, 06:00 PM).
  - Test notification trigger button and live status badge.

---

## 2. Calendar & Agenda View ("Care Schedule") — ✅ COMPLETED

### Objective
Allow gardeners to look ahead and see their care duties for the coming week and month, rather than only seeing plants overdue for water today.

### Technical Architecture
- **Location**: Dedicated bottom navigation tab in `src/app/(tabs)/calendar.tsx` (*"Schedule"*), backed by `src/components/care-schedule-view.tsx`.
- **Data Engine**: Compute projected watering dates from `plants` (`lastWateredAt + customWateringIntervalDays`) and combine with historical `entries` (`CareEventType`).

### Implementation Status
- [x] **Calendar Projection Helper (`src/services/calendarUtils.ts`)**:
  - `getProjectedCareEvents(plants: UserPlant[], entries: NotebookEntry[], rangeDays: number = 30)`: Returns a 30-day timeline of dates with projected plant care tasks (including multi-cycle lookahead and overdue anchoring) and completed entries.
  - `getHistoricalCareEvents(entries: NotebookEntry[])`: Maps past events to local `YYYY-MM-DD` date keys for completed markers and badges.
- [x] **UI Components (`src/app/(tabs)/calendar.tsx` & `src/components/care-schedule-view.tsx`)**:
  - **Bottom Navigation Bar Tab**: Dedicated **Schedule** tab in `src/app/(tabs)/_layout.tsx` alongside **My Garden**, **Add / AI Scan**, and **Account**.
  - **Horizontal Date Strip**: Scrollable 14-day strip at the top showing date chips with dot badges (Blue = Water, Amber = Fertilize, Green = Propagation) and task counters.
  - **Selected Day & Upcoming 2-Week Agenda Task List**: Day-by-day cards featuring plant photo, nickname, species/location, tailored care action pill (*"Due Today for Soak & Dry"*, *"Refresh Water Tomorrow"*, *"Due in 3 days"*), completed log rows, and inline **"Mark Watered"** quick-action buttons.
- [x] **Monthly Heatmap (`30d Map` Toggle)**:
  - Interactive 30-day watering load heatmap grid showing busy watering days and allowing one-tap date inspection.

---

## 3. Botanical & AI Intelligence Enhancements

### 3.1 Pet Safety & Toxicity Warnings
- **Goal**: Instantly warn pet owners if a plant is dangerous to cats or dogs.
- **Domain Model Extension (`src/types/plant.ts`)**:
  ```typescript
  export interface PetSafetyInfo {
    isToxicToCats: boolean;
    isToxicToDogs: boolean;
    isToxicToHumans?: boolean;
    toxicityLevel?: 'non_toxic' | 'mild' | 'moderate' | 'severe';
    toxicPrinciples?: string; // e.g., 'Insoluble calcium oxalates'
    safetyNotes?: string;
  }
  ```
- **AI Prompt Update (`src/services/aiPlantService.ts`)**:
  - Update `PLANT_IDENTIFICATION_SYSTEM_PROMPT` to require `petSafety` in the JSON response schema.
- **UI Enhancements**:
  - Add a **Pet Safety Badge** on:
    - AI Identification scan results before adding to garden.
    - Plant Detail header (`src/app/plant/[id].tsx`).
    - Species catalog card.
  - Visual icons: 🐱 🐶 with a green shield (*"Pet Safe"*) or red warning shield (*"Toxic to Cats & Dogs"*).

### 3.2 Multi-Photo Diagnostics
- **Goal**: Improve AI diagnostic accuracy by allowing up to 3 specialized photos instead of a single angle.
- **Input Angles**:
  1. **Habit / Full Plant**: To evaluate shape, leaning, etiolation, overall posture.
  2. **Close-Up of Leaves/Stem**: To inspect pest damage (spider mites, thrips), leaf spots, or fungal lesions.
  3. **Soil & Pot Base**: To check soil moisture, compaction, salt buildup, and drainage hole existence.
- **Implementation**:
  - Update `src/app/(tabs)/scan.tsx` diagnosis mode to display a 3-tile photo uploader with labels.
  - Update `prepareImageForAI` in `src/services/imageUtils.ts` to compress and bundle multiple base64 images into the Gemini `contents.parts` payload.
  - Update prompt with structured angle labels so the LLM cross-references the leaf spot with the soil conditions.

### 3.3 Weather-Adaptive Care
- **Goal**: Adjust watering schedules dynamically based on local temperature, humidity, and rainfall.
- **API**: **Open-Meteo REST API** (`https://api.open-meteo.com/v1/forecast`):
  - Completely free, no API key required, highly accurate, and privacy-respecting.
- **Integration & Rules**:
  - **Indoor Adjustments**:
    - High indoor heat (>30°C / 86°F) or low humidity (<30%): Suggest watering 1–2 days sooner.
    - Winter dormancy / cool temps (<16°C / 60°F): Advise backing off watering by 2–4 days.
  - **Outdoor Adjustments**:
    - Rainfall > 10mm in past 24h: Prompt to mark outdoor plants as watered or automatically push due date back.
    - Frost warning (< 3°C / 37°F): High-urgency alert: *"Bring your outdoor succulents indoors to prevent freeze damage!"*
- **UI**:
  - Weather card banner on the My Garden dashboard showing today's temperature, humidity, and weather recommendation.

### 3.4 Light Exposure Estimator (Camera Lux Meter)
- **Goal**: Eliminate the ambiguity of *"bright indirect light"* by giving users an instant camera-based light meter.
- **Mechanism**:
  - Use `expo-camera` or screen brightness / ambient sensing to gauge scene luminosity.
- **Light Zones**:
  - **Low Light (< 500 Lux)**: Snake Plant, ZZ Plant, Cast Iron Plant.
  - **Medium Light (500 – 2,500 Lux)**: Pothos, Monstera deliciosa, Calatheas.
  - **Bright Indirect (2,500 – 10,000 Lux)**: Jade Plant, Ficus lyrata, Hoyas.
  - **Direct Sunlight (> 10,000 Lux)**: Desert Cacti, Agave, Outdoor Herbs.
- **UX**:
  - An interactive modal accessible from the Scan tab or Plant Edit screen:
  - User points their phone camera toward the plant spot; a live speedometer gauge swings between Low, Medium, Bright Indirect, and Direct Sun with real-time feedback.

---

## 4. UX Polish & Real-Time Sync

### 4.1 Haptic Feedback (`expo-haptics`)
- **Library**: `expo-haptics`.
- **Sensory Touchpoints**:
  - **Light Impact (`impactAsync(Light)`)**:
    - Tapping category filter pills (*"All"*, *"Needs Water"*, *"Succulent"*).
    - Checking off action items on health assessment cards.
  - **Medium Impact (`impactAsync(Medium)`)**:
    - Swiping to reveal quick actions on plant cards.
    - Toggling drainage switches or light exposure options.
  - **Success Notification (`notificationAsync(Success)`)**:
    - Tapping **"Water Now"** / **"Water All"**.
    - Completing a plant scan & AI diagnostic analysis.
    - Successful cloud sync.

### 4.2 Sync Status & Connectivity Indicator
- **Goal**: Provide transparent feedback about data persistence and offline state.
- **Header Status Pill** (in `src/app/_layout.tsx` or tab header):
  - 🟢 **Synced**: All changes safely committed to Supabase PostgreSQL & Storage.
  - 🟡 **Offline (Saved Locally)**: Device is disconnected; edits are safely stored in AsyncStorage and queued for background sync.
  - 🔄 **Syncing...**: Active batch upsert to Supabase in progress.
- **Pending Changes Counter**:
  - Track uncommitted local writes and trigger an automatic sync as soon as network connectivity is restored (via `NetInfo` or Supabase reconnection listener).

---

## 5. Phased Execution Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Core Retention
        A[1. expo-notifications] --> B[Watering Reminder Scheduling]
        B --> C[Daily Garden Morning Digest]
        D[4.1 expo-haptics] --> E[Tactile Feedback on Care Actions]
    end

    subgraph Phase 2: Care Planning & Safety
        F[2. Calendar & Agenda View] --> G[Weekly Timeline & Heatmap]
        H[3.1 Pet Safety] --> I[Toxicity Badges & AI Identification Schema]
        J[4.2 Sync Status Indicator] --> K[Header Online/Offline State Pill]
    end

    subgraph Phase 3: Advanced Intelligence
        L[3.2 Multi-Photo Diagnostics] --> M[3-Angle Gemini Assessment]
        N[3.3 Weather-Adaptive Care] --> O[Open-Meteo Integration & Frost Alerts]
        P[3.4 Light Exposure Estimator] --> Q[Camera Lux Gauge]
    end

    Phase 1 --> Phase 2 --> Phase 3
```

---

## 6. Recommended Immediate Next Step

Local Care Notifications and Calendar & Agenda View are complete. Next steps:
1. Install `expo-haptics` and implement sensory touchpoints (4.1 Haptic Feedback).
2. Implement **3.1 Pet Safety & Toxicity Warnings** and **4.2 Sync Status & Connectivity Indicator**.

