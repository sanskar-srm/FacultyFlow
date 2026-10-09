# Faculty Flow

A small, fully offline Android planner for teachers and faculty. Add a task in a few taps, see
today's tasks, tick them off, and get a reminder before each one starts, either as a normal
notification or as an alarm-style alert that rings until you respond. No account, no internet, no
server, no tracking. The spec is in [Teacher_Task_Manager_PRD.md](Teacher_Task_Manager_PRD.md)
(see "Version 1.1" at the end for what changed in this release).

**Stack:** Expo SDK 57, React Native, TypeScript, Expo Router (tabs), `expo-sqlite`,
`expo-notifications` (local scheduled notifications only), `@expo/vector-icons` (Feather), and one
small local native module for alarm alerts (`modules/faculty-alarm`, Kotlin, no third-party code).
Styling is plain `StyleSheet` with a single design-system file (`src/theme/theme.ts`).

## Project layout

```
app/                       Expo Router screens
  _layout.tsx              boot (DB, theme, icon font, reminders) + first-launch gate
  setup.tsx, profile.tsx   first-launch profile / edit profile
  (tabs)/                  Today, Calendar, Tasks, Settings
  task/new.tsx, [id].tsx   add / edit / delete
src/
  theme/theme.ts           colours (light + dark), spacing, radii, type sizes
  components/              task row, list rows, bottom sheets, time/date pickers, ...
  database/                SQLite open + versioned migrations + repositories
  notifications/           notificationService (standard) and alarmService (alarm alerts)
  services/taskService     every task change: DB first, then reminder (never loses a task)
  utils/                   dates, recurrence, greeting, alarm content (pure, unit-tested)
modules/faculty-alarm/     native alarm alerts (AlarmManager + full-screen alert screen)
scripts/generate-assets.mjs  app icon, adaptive icon, splash and notification icon
__tests__/                 unit tests for the pure logic
```

## Run in development

Requirements: Node 20+, JDK 17, Android SDK (Android Studio), and an Android phone with USB
debugging or an emulator.

```bash
npm install
npx expo run:android
```

This builds a development app with the real native modules, installs it and starts Metro.

> **Do not use Expo Go.** Alarm alerts are a native module that Expo Go does not contain (in Expo
> Go the "Alarm alert" option is disabled and the app falls back to notifications). Expo Go also
> uses its own package, channels and background behaviour, so it does not show how the APK behaves.

If code edits stop showing up in the running development app (seen on Windows, where Metro's
file watcher can miss changes), stop Metro and run `npx expo start --clear`, then reopen the app.

Checks:

```bash
npm run typecheck
npm run lint
npm test
```

## Build the APK

**Option A: EAS cloud build** (free Expo account; signs the APK for you)

```bash
npx eas-cli@latest build --platform android --profile preview
```

**Option B: local build** (no account; uses this machine's Android SDK and JDK 17)

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

The APK is at `android/app/build/outputs/apk/release/app-release.apk`. The architecture flag keeps
the APK small by including only real-phone CPUs.

> **Windows:** native C++ builds fail with *"Filename longer than 260 characters"* if the project
> lives in a deep folder. Keep it in a short path, or use Option A.

A local release build is signed with the debug key, which is fine for your own phones. For wider
distribution create your own keystore (or use Option A) so future updates install over the top.

**Package id:** version 1.1 uses `com.facultyflow.app`. Android treats this as a new app, so an
installed "Teacher Task Manager" APK (`com.teachertaskmanager.app`) is not upgraded in place and
its tasks are not carried over. Uninstall the old app after moving anything you need.

## Install the APK

- **USB:** `adb install -r android/app/build/outputs/apk/release/app-release.apk`
- **No cable:** copy the `.apk` to the phone, open it, and allow "Install unknown apps" when asked.

## Reminders

Settings, Reminders:

- **Task reminders** (master switch). Off cancels every scheduled reminder but keeps each task's
  reminder setting; on schedules them again.
- **Reminder style:**
  - **Notification** (default): a standard notification with the usual sound.
  - **Alarm alert**: rings on the alarm volume (audible in vibrate mode, keeps ringing until you
    act, stops after 10 minutes), vibrates, and shows a full-screen alert over the lock screen with
    **Done** (completes the task), **Snooze** (5, 10 or 15 minutes, set in Settings) and
    **Dismiss** (task stays open). The same three buttons are on the notification.

**Remind me** (per task, on the Add/Edit screen): a switch above the reminder timing. On by
default (10 minutes before). Off saves the task as a note: it never schedules a notification or
alarm, in either style, including future occurrences of a recurring task. Note-only tasks still
show in Today, Tasks and Calendar and count towards "tasks left today". Task rows show a small bell
next to the time only when the task has a reminder. Stored as `reminder_minutes = NULL`, so tasks
that already had "No reminder" became note-only with no migration.

Both styles follow the same rules: editing a task reschedules its reminder, completing or deleting
it cancels the reminder, recurring tasks schedule only their next occurrence, and every app launch
reconciles the scheduled reminders with the database.

### How alarm alerts work

`modules/faculty-alarm` (Kotlin, about 500 lines):

- **Timing:** `AlarmManager.setAlarmClock`, which is exact and allowed in Doze. If exact alarms
  are not allowed, it falls back to an inexact alarm (may be a few minutes late).
- **Sound:** an "Alarm alerts" notification channel whose sound is the phone's default alarm tone
  on the **alarm audio stream**, repeating until the user acts. No foreground service is needed.
  Do Not Disturb lets it through when "Alarms" are allowed (Android's default). The app does not
  request DND access.
- **Screen:** a full-screen intent opens a small native alert screen (`AlarmActivity`) on a locked
  or sleeping phone. On an unlocked phone in use, Android shows it as a heads-up notification
  instead, as with any alarm app.
- **Several at once:** alarms that ring while another is showing wait in a queue and appear one at
  a time.
- **App closed:** "Done" on the lock screen is stored natively and applied the next time the app
  runs (immediately if it is running). For recurring tasks the alarm also arms the next occurrence
  on its own (up to 14 occurrences ahead), so a daily alarm keeps working even if the app is not
  opened for a while.
- **Reboot / update:** a boot receiver re-arms stored alarms. Alarms missed while the phone was off
  ring after boot if they are less than 30 minutes late. App launch reconcile covers the rest.

### Permissions

| Permission | Why | When |
|---|---|---|
| `POST_NOTIFICATIONS` | any reminder | asked once after first-time setup; asked again when Alarm alert is chosen if still missing |
| `USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM` | on-time reminders | granted at install (no prompt) |
| `USE_FULL_SCREEN_INTENT` | alarm screen over the lock screen | declared in the manifest. Android 14+ can require the user to allow it in system settings |
| `RECEIVE_BOOT_COMPLETED` | restore reminders after reboot | no prompt |
| `VIBRATE` | vibration | no prompt |
| `INTERNET` | added by Expo/React Native tooling; the app makes no network requests | no prompt |

Nothing is requested until the user chooses Alarm alert and confirms the explanation dialog.
**Settings, Check alarm permissions** then shows each requirement as Allowed or Open, and opens
the exact system screen for anything missing. If full-screen or exact-alarm permission is missing,
alarms fall back to a ringing high-priority notification and Settings says so. Nothing crashes,
and no task or reminder is lost.

### Phone makers and battery optimisation

Xiaomi/Redmi/POCO, Oppo, Realme, Vivo, OnePlus and Samsung ("Deep sleeping apps") can stop alarms
from apps they think are idle. If reminders are late or missing:

1. Settings, Alarm alerts, **Battery optimisation**: set Faculty Flow to **Unrestricted / No
   restrictions**.
2. Allow **Autostart** (Xiaomi, Oppo, Vivo, Realme) in the phone's security or app settings.
3. Do not swipe the app away from recent apps on phones that treat that as *Force stop*.

**Force stop** (from system settings) cancels all of an app's alarms until the app is opened again.
That is an Android rule no app can avoid.

## Test reminders on a phone

Use a release APK or `npx expo run:android`, not Expo Go.

1. **Notification style:** add a task 2 minutes ahead with "At task time". Lock the phone. It
   should arrive at that minute.
2. **Alarm alert:** Settings, Alarm alert, Continue. Fix anything shown in *Check alarm
   permissions*. Tap **Test alarm** and lock the phone: within about 10 seconds the screen turns on
   with the full-screen alert and the alarm sound. Try **Done**, **Snooze** and **Dismiss** on a
   real task 2 minutes ahead.
3. **Master switch:** turn Task reminders off and wait past a reminder (nothing rings), then on.
4. **Edit / complete / delete** a task with a pending reminder: only the new time rings, or nothing.
5. **Reboot:** schedule a reminder 5 minutes ahead, reboot, and do not open the app. It should ring.

Useful while testing (adb):

```bash
adb shell dumpsys alarm | grep -i facultyflow
```

## Brand assets

Icon, adaptive icon (foreground, background colour, monochrome), splash image and notification
icon are generated from one SVG description:

```bash
node scripts/generate-assets.mjs
```

Colours and shapes are at the top of the script (`BRAND`, `MARK`). The accent `#0F766E` matches
`primary` in `src/theme/theme.ts`, the splash colours in `app.json`, and the notification colour.
`assets/brand-preview.png` shows the set at a glance. Run `npx expo prebuild --clean` after
regenerating.

## Notes and decisions

- Dates are stored as local `YYYY-MM-DD`, times as local 24-hour `HH:mm`, and displayed in 12-hour
  format. "Overdue" is computed, never stored.
- Database migrations are versioned with `PRAGMA user_version` (`src/database/migrations.ts`).
  v2 adds the reminder style (default *Notification*) and snooze length; existing tasks, profile
  and settings are untouched.
- Recurring tasks are a single row. Completing one moves it to its next occurrence (on or after
  today) and schedules only that reminder.
- The time picker is a small themed bottom sheet with snapping wheels (5-minute steps, or any
  minute) and presets. The date picker uses the same sheet and the app's own month grid, so both
  look the same on every Android version. `@react-native-community/datetimepicker` was removed.
- The bottom tab bar is a custom component (`src/components/PillTabBar.tsx`, passed as the
  `tabBar` prop in `app/(tabs)/_layout.tsx`): a floating white pill with a mint highlight behind the
  active tab, plain views, no animation. It sits in the layout above the system navigation area, so
  screen content never scrolls underneath it, and it hides while the keyboard is open. Its green
  (`#0A7A4B`, dark `#7BD9A8`) is now the app-wide accent in `src/theme/theme.ts`.
- Icons: Feather from `@expo/vector-icons`. Only the Feather font is bundled, and it is loaded
  while the splash screen is up so icons never flash in.
- New dev dependency: `sharp` (asset generator only, never in the APK). Removed: `expo-symbols`
  and the community date-time picker.
- `react-native-reanimated`, `react-native-worklets` and `react-native-gesture-handler` are
  installed only because Expo Router requires them.
- R8 minification is left off on purpose (expo-notifications stores scheduled reminders with Java
  serialization). Turn it on only together with a full reminder re-test.
