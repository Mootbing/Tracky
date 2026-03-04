# Live Activities & Notifications for Tracky

## Context

Tracky is an Amtrak train tracking app (Expo SDK 54) that currently has zero notification or background task infrastructure. Users save upcoming trains and see real-time delay/position data, but only while the app is in the foreground. This plan adds:

1. **Local notifications** — 2 hours before a saved train's departure
2. **iOS Live Activities** — lock screen / Dynamic Island display for active trains
3. **Background updates** — keep Live Activities and delay alerts fresh when backgrounded
4. **Settings UI** — toggles for all notification features in the existing settings page

---

## Phase 1: Install Dependencies & Configure

**Install packages:**
```
npx expo install expo-notifications expo-task-manager expo-background-task expo-live-activity
```

**Modify `app.json`** — add plugins:
```json
["expo-notifications", { "sounds": [] }],
["expo-background-task"],
["expo-live-activity", { "widgetName": "TrackyWidgets" }]
```

Add iOS `infoPlist` for Live Activities support and Android notification permission.

**Files:** `app.json`, `package.json`

---

## Phase 2: Notification Preferences Storage

**Modify `services/storage.ts`:**
- Add `NotificationPrefs` interface:
  ```ts
  { departureReminders: boolean; delayAlerts: boolean; liveActivities: boolean }
  ```
- Add `NOTIFICATION_PREFS` to `STORAGE_KEYS`
- Add `getNotificationPrefs()` / `saveNotificationPrefs()` — same pattern as `CalendarSyncPrefs`

---

## Phase 3: Notification Service

**Create `services/notifications.ts`:**
- `requestPermissions()` — request iOS/Android notification permission
- `getPermissionStatus()` — check current status
- `scheduleDepartureReminder(train)` — schedule local notification 2h before departure
  - Uses `parseTimeToDate()` from `utils/time-formatting.ts` with `train.travelDate` as base
  - Accounts for `departDayOffset` for overnight trains
  - Skips if trigger time is already past
  - Content: *"Train {number} departs in 2 hours"* / *"{from} to {to} at {departTime}"*
- `cancelDepartureReminder(tripId, fromCode, toCode)` — cancel by identifier
- `cancelAllReminders()`
- `sendDelayAlert(train, oldDelay, newDelay)` — immediate local notification for significant delay changes (>=5 min threshold)

**Modify `app/_layout.tsx`:**
- Add `Notifications.setNotificationHandler()` at module level (required by expo-notifications)

---

## Phase 4: Live Activity Service

**Create `services/live-activity.ts`:**
- Wraps `expo-live-activity` APIs (`startActivity`, `updateActivity`, `stopActivity`)
- `startForTrain(train)` — starts Live Activity with train number, route, stations, times, delay
- `updateForTrain(train)` — pushes fresh delay/status data
- `endForTrain(tripId)` — ends the activity (train arrived or deleted)
- `endAll()` — cleanup
- Tracks active activity IDs in a `Map<string, string>` (tripId -> activityId)
- iOS only — no-ops on Android via `Platform.OS` check

**Create `targets/TrackyWidgets/TrainLiveActivity.swift`:**
- `ActivityAttributes` struct: static props (trainNumber, routeName, fromCode, toCode, departTime, arriveTime) + dynamic `ContentState` (delayMinutes, status, lastUpdated)
- Lock screen view: train number, route, origin/destination with times, delay badge (green/red)
- Dynamic Island compact: train icon (leading), delay text (trailing)
- Dynamic Island expanded: origin→destination with times, delay status, route name

**Start condition:** `daysAway === 0` AND current time is within 2 hours before departure through arrival
**End condition:** arrival time + delay has passed, or train deleted/archived

---

## Phase 5: Background Task

**Create `services/background-tasks.ts`:**
- `TaskManager.defineTask()` at module level (required)
- Task fetches real-time data for today's saved trains, updates Live Activities, sends delay alerts
- `BackgroundTaskService.register()` — registers with `expo-background-task` (15 min minimum interval on iOS)
- `BackgroundTaskService.unregister()` — called when all notification features disabled
- Import in `app/_layout.tsx` to ensure task definition runs early

**Note:** iOS background task timing is best-effort (Apple controls scheduling). Foreground polling (existing 20s interval) remains the primary real-time source. Background task supplements it.

---

## Phase 6: Orchestrator

**Create `services/train-activity-manager.ts`:**

Central coordinator called from existing train lifecycle points:

| Method | Called from | Action |
|--------|-----------|--------|
| `onTrainSaved(train)` | `ModalContent.tsx` line 136 (after `saveTrainRef`) | Schedule departure reminder, start Live Activity if active now |
| `onTrainDeleted(tripId, from, to)` | `ModalContent.tsx` line 198 (after `deleteTrainByTripId`) | Cancel reminder, end Live Activity |
| `onTrainArchived(train)` | `ModalContent.tsx` line 82 (in auto-archive loop) | End Live Activity |
| `onRealtimeUpdate(old, new)` | `useRealtime.ts` line 21 (after refresh) | Update Live Activities, check delay alerts |
| `onAppStartup(trains)` | `ModalContent.tsx` line 60 (after loading trains) | Start Live Activities for active trains, register background task |

All methods check `NotificationPrefs` before acting — if a feature is disabled, the method no-ops.

---

## Phase 7: Settings UI

**Modify `components/ui/SettingsModal.tsx`:**

1. Add `'notifications'` to `SectionPage` type union (line 78)
2. Add `openSubpage('notifications')` to the existing `openSubpage` callback (line 92)
3. Load `NotificationPrefs` in the existing `useEffect` (line 134)

4. Add **NOTIFICATIONS** section to `renderMainPage()` between AUTOMATIONS and UNITS (after line 363):
   ```
   NOTIFICATIONS
   ┌─────────────────────────────────────────────┐
   │ 🔔  Notifications                     >     │
   │     Departure reminders, delay alerts        │
   └─────────────────────────────────────────────┘
   ```

5. Add `renderNotificationsPage()` subpage with toggles:
   ```
   ← Notifications

   REMINDERS
   ┌─────────────────────────────────────────────┐
   │ Departure Reminders              [toggle]   │
   │ Notify 2 hours before departure             │
   ├─────────────────────────────────────────────┤
   │ Delay Alerts                     [toggle]   │
   │ Notify when delays change significantly     │
   └─────────────────────────────────────────────┘

   LIVE TRACKING  (iOS only — hidden on Android)
   ┌─────────────────────────────────────────────┐
   │ Live Activities                   [toggle]   │
   │ Show train on Lock Screen & Dynamic Island  │
   └─────────────────────────────────────────────┘
   ```

6. Toggle handlers:
   - On first enable of any toggle → call `NotificationService.requestPermissions()`
   - If denied → show Alert with "Open Settings" button (`Linking.openSettings()`)
   - On enable departure reminders → schedule for all saved trains via `NotificationService.rescheduleAllReminders()`
   - On disable → cancel all via `NotificationService.cancelAllReminders()`
   - On enable Live Activities → start for any currently-active trains, register background task
   - On disable all features → unregister background task
   - Persist prefs immediately via `TrainStorageService.saveNotificationPrefs()`

Uses `Switch` from React Native for toggles. Follows the existing settings item pattern (icon + title + subtitle).

---

## Files Summary

### New files
| File | Purpose |
|------|---------|
| `services/notifications.ts` | Local notification scheduling & permissions |
| `services/live-activity.ts` | Live Activity start/update/end wrapper |
| `services/background-tasks.ts` | Background task definition & registration |
| `services/train-activity-manager.ts` | Orchestrator tying all pieces together |
| `targets/TrackyWidgets/TrainLiveActivity.swift` | SwiftUI Live Activity UI |

### Modified files
| File | Changes |
|------|---------|
| `app.json` | Add notification, background-task, live-activity plugins |
| `app/_layout.tsx` | Add notification handler, import background task registration |
| `services/storage.ts` | Add `NotificationPrefs` type + get/save methods |
| `components/ui/SettingsModal.tsx` | Add NOTIFICATIONS section + notifications subpage with toggles |
| `screens/ModalContent.tsx` | Call `TrainActivityManager` at save, delete, archive, startup |
| `hooks/useRealtime.ts` | Call `TrainActivityManager.onRealtimeUpdate()` with old/new train comparison |

---

## Verification

1. **Type-check:** `npm run type-check` passes
2. **Notifications:** Save a train departing ~2h from now → verify notification appears → delete train → verify notification cancelled
3. **Live Activities:** Save a train departing today → verify Live Activity appears on lock screen → verify delay updates propagate → verify it ends after arrival time
4. **Settings:** Toggle each setting on/off → verify permission prompt on first enable → verify prefs persist across app restart
5. **Background:** Background the app with an active Live Activity → verify it still updates (within iOS scheduling constraints)
6. **Android:** Verify Live Activity toggles are hidden, notifications work normally
