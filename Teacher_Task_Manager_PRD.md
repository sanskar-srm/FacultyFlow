# Faculty Flow (formerly Teacher Task Manager)

## Product Requirements Document (PRD)

**Version:** 1.0  
**Platform:** Android  
**Distribution:** Direct APK  
**Architecture:** Fully Offline / Local-Only  
**Primary Goal:** Help teachers manage tasks, schedules, and reminders quickly and reliably without requiring an internet connection.

---

## 1. Product Overview

Teacher Task Manager is a lightweight Android application designed for teachers and faculty members to manage their daily tasks, schedules, deadlines, meetings, academic work, and personal reminders.

The app must work completely offline after installation. All task data and profile information are stored locally on the device. Reminders use Android local scheduled notifications rather than remote push notifications.

The app should prioritize:

- Simplicity
- Speed
- Offline reliability
- Easy task creation
- Clear daily planning
- Reliable local reminders
- Minimal UI and low resource usage

This is a utility application, not a social or cloud-based productivity platform.

---

## 2. Problem Statement

Teachers often manage multiple activities throughout the day, including:

- Classes
- Meetings
- Assignments
- Administrative work
- Student-related tasks
- Academic deadlines
- Personal tasks
- Follow-ups and reminders

The application should provide one simple place to record these tasks and receive reminders at the appropriate time.

The user should not need:

- An account
- Internet access
- Cloud synchronization
- A backend server
- Firebase
- Supabase
- Remote push notifications

---

## 3. Goals

### Primary Goals

1. Allow a teacher to create and manage tasks quickly.
2. Allow tasks to have scheduled dates and times.
3. Send local reminders for scheduled tasks.
4. Work completely offline.
5. Keep completed tasks visible with a strike-through state.
6. Provide a simple Today view showing remaining tasks.
7. Personalize the home screen using the teacher's name and designation.
8. Allow the user to enable/disable notifications.
9. Support Light, Dark, and System themes.
10. Keep the APK lightweight and easy to use on the go.

### Non-Goals for V1

The following are explicitly excluded from Version 1:

- User authentication
- Cloud accounts
- Backend server
- Cloud synchronization
- Remote push notifications
- Voice input
- Diary/image scanning
- OCR
- AI assistant
- Cloud backup
- Social features
- Team collaboration
- Complex calendar integration

These may be considered for future versions.

---

# 4. Technology Stack

## Frontend

- React Native
- Expo
- Expo Router
- TypeScript
- NativeWind CSS

## Navigation

Use the Expo Router Tabs template.

Primary tabs:

1. Today
2. Calendar
3. Tasks
4. Settings

## Local Database

Use:

- Expo SQLite

SQLite should store:

- User profile
- Tasks
- Task completion state
- Reminder configuration
- Recurrence configuration
- Notification identifiers where required

## Notifications

Use:

- Expo Notifications
- Android local scheduled notifications

Important:

This application uses **local scheduled notifications**, not remote push notifications.

The device itself schedules and displays reminders. No server or internet connection should be required.

---

# 5. Application Architecture

The application must follow a local-first architecture.

```text
React Native UI
      |
      v
Application Logic
      |
      +--------> SQLite Database
      |
      +--------> Local Notification Service
      |
      v
Android Device
```

There must be no dependency on an external backend for core functionality.

---

# 6. First Launch Experience

The application should not have a login screen.

On the first launch only, ask the user for:

### Name

Example:

```text
Sanskar
```

### Designation

Provide a simple selection list:

- Teacher
- Assistant Professor
- Associate Professor
- Professor
- Faculty
- Other

Allow the user to enter/select a designation.

### First Launch Flow

```text
Install APK
    ↓
Open App
    ↓
Profile Setup
    ↓
Enter Name
    ↓
Select Designation
    ↓
Save Profile
    ↓
Request Notification Permission
    ↓
Open Today Screen
```

The profile should be stored locally.

The setup screen should not appear again unless the user manually edits the profile from Settings or clears the application data.

---

# 7. Home / Today Screen

The Today screen is the primary screen of the application.

It should be simple and immediately useful.

## 7.1 Greeting

The greeting should change according to the current time.

### Morning

```text
Good Morning, Professor Sanskar
```

### Afternoon

```text
Good Afternoon, Professor Sanskar
```

### Evening

```text
Good Evening, Professor Sanskar
```

### Night

```text
Good Night, Professor Sanskar
```

Use the saved designation and name.

Do not hard-code the greeting.

---

## 7.2 Remaining Task Count

Show:

```text
You have 5 tasks left today
```

The count must include only incomplete tasks scheduled for the current date.

Completed tasks must not be included.

If there are no incomplete tasks:

```text
You're all caught up
```

---

## 7.3 Today's Tasks

Display tasks scheduled for today.

Each task should show:

- Completion checkbox
- Task title
- Time
- Priority indicator
- Category
- Reminder information when useful

Example:

```text
[ ] Faculty Meeting
   10:30 AM
   Meeting · High

[x] Submit Attendance
   12:00 PM
   Academic
```

Completed tasks remain visible but should appear visually less prominent.

Completed task titles must have a strike-through.

Example:

```text
[x] Submit Attendance
   12:00 PM
```

---

# 8. Task Management

The user should be able to:

- Add task
- View task
- Edit task
- Delete task
- Mark task complete
- Mark completed task incomplete

---

## 8.1 Add Task

Task creation should be quick and require minimal interaction.

### Required Fields

#### Task Title

Example:

```text
Submit internal assessment marks
```

#### Date

Example:

```text
07 October 2026
```

#### Time

Example:

```text
04:30 PM
```

#### Reminder

Options:

- At task time
- 5 minutes before
- 10 minutes before
- 30 minutes before
- 60 minutes before
- No reminder

### Optional Fields

#### Description

Additional notes related to the task.

#### Priority

Options:

- Low
- Medium
- High

Default:

```text
Medium
```

#### Category

Options:

- Academic
- Meeting
- Administrative
- Personal
- Other

Default:

```text
Other
```

#### Repeat

Options:

- Does not repeat
- Daily
- Weekdays
- Weekly
- Monthly

Default:

```text
Does not repeat
```

---

# 9. Task Completion

When a user completes a task:

1. Set `completed = true`.
2. Store `completedAt`.
3. Cancel its pending notification if one exists.
4. Keep the task visible.
5. Apply strike-through styling.
6. Remove it from the remaining-task count.

Example:

```text
Before:

[ ] Faculty Meeting
   02:00 PM

After:

[x] Faculty Meeting
   02:00 PM
```

The task must not disappear immediately after completion.

This is important because the user should be able to see what they have already completed.

---

# 10. Overdue Tasks

If a task's scheduled date/time has passed and it is still incomplete:

- Mark it as overdue.
- Keep it visible.
- Allow the user to complete it normally.

Example:

```text
[ ] Submit Report
   Yesterday · 05:00 PM
   Overdue
```

Overdue tasks must not be automatically deleted.

---

# 11. Recurring Tasks

V1 should support basic recurrence.

Supported recurrence types:

- Daily
- Weekdays
- Weekly
- Monthly

Avoid complex recurrence rules in V1.

For recurring tasks, the implementation should create/manage the next occurrence safely without creating an uncontrolled number of database records or notifications.

---

# 12. Notifications

Notifications are a core feature.

## 12.1 Notification Type

Use Android local scheduled notifications.

Do not use:

- Firebase Cloud Messaging
- Remote push notifications
- Backend notification APIs

The app must be capable of scheduling reminders while offline.

---

## 12.2 Notification Example

If the task is:

```text
Faculty Meeting
10:30 AM
Reminder: 10 minutes before
```

The device should display:

```text
Faculty Meeting
Starting in 10 minutes
```

---

## 12.3 Notification Permission

Request notification permission during first-time setup after the user saves their profile.

If the user denies permission:

- The application must continue working.
- Tasks must continue to work normally.
- The user should be able to enable notifications later from device/app settings where supported.

Do not block the user from using the application.

---

# 13. Notification Master Switch

Settings must contain:

```text
Task Reminders
ON / OFF
```

### When ON

Schedule eligible reminders.

### When OFF

Cancel scheduled task notifications.

Do not delete reminder settings from tasks.

If the user turns notifications ON again:

- Re-schedule eligible upcoming reminders.

The notification toggle must act as a master switch.

---

# 14. Calendar Screen

The Calendar tab provides a lightweight overview of tasks.

Requirements:

- Display calendar dates.
- Show an indicator on dates containing tasks.
- Allow the user to select a date.
- Display tasks for the selected date.
- Allow opening/editing a task.
- Allow completing a task.

Avoid implementing a complex full calendar/scheduling system.

The calendar should remain lightweight.

---

# 15. Tasks Screen

The Tasks tab provides a broader task list.

Suggested sections:

```text
Active
Completed
```

Active tasks can include:

- Upcoming
- Today
- Overdue

Avoid excessive filtering in V1.

The screen should remain easy to scan.

Completed tasks must retain their strike-through appearance.

---

# 16. Settings Screen

Settings should contain the following sections.

## Profile

Display:

```text
Name
Designation
```

Allow:

```text
Edit Profile
```

Changing the profile should immediately update the home greeting.

---

## Notifications

```text
Task Reminders
[ ON / OFF ]
```

---

## Appearance

Options:

```text
System
Light
Dark
```

Default:

```text
System
```

The selected theme should be stored locally.

---

## About

Display:

- App name
- Version
- Basic app information

No unnecessary settings should be added.

---

# 17. Data Model

## User Profile

Suggested fields:

```text
id
name
designation
createdAt
updatedAt
```

Only one local profile is required.

---

## Task

Suggested TypeScript model:

```ts
type RepeatType =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly";

type Priority =
  | "low"
  | "medium"
  | "high";

type Category =
  | "academic"
  | "meeting"
  | "administrative"
  | "personal"
  | "other";

interface Task {
  id: string;
  title: string;
  description?: string;

  scheduledDate: string;
  scheduledTime: string;

  priority: Priority;
  category: Category;

  reminderMinutes: number | null;
  repeatType: RepeatType;

  completed: boolean;
  completedAt?: string | null;

  notificationId?: string | null;

  createdAt: string;
  updatedAt: string;
}
```

---

# 18. SQLite Database

Suggested task table:

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'other',
  reminder_minutes INTEGER,
  repeat_type TEXT NOT NULL DEFAULT 'none',
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Suggested profile table:

```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

The database layer should handle:

- Initialization
- Migrations
- CRUD operations
- Queries for today's tasks
- Queries for upcoming tasks
- Queries for completed tasks
- Queries for overdue tasks

---

# 19. Notification Scheduling Logic

When a task is saved:

```text
Task created
    ↓
Check notification setting
    ↓
Notifications ON?
    ↓
Yes
    ↓
Calculate reminder time
    ↓
Schedule local notification
    ↓
Save notification ID
```

When a task is edited:

```text
Cancel old notification
    ↓
Update task
    ↓
Schedule new notification
    ↓
Save new notification ID
```

When a task is completed:

```text
Mark completed
    ↓
Cancel pending notification
    ↓
Store completedAt
```

When a task is deleted:

```text
Cancel pending notification
    ↓
Delete task
```

---

# 20. Date and Time Handling

Date/time handling must be consistent.

Use local device time for:

- Greetings
- Today's date
- Task scheduling
- Reminder scheduling
- Overdue calculation

Avoid manually implementing timezone conversion unless required.

Store dates/times in a consistent format.

The app should correctly handle:

- Midnight
- Day changes
- Month changes
- Year changes
- Past tasks
- Future tasks

---

# 21. UI / UX Requirements

The application should feel like a simple utility rather than a complex productivity platform.

## Design Principles

- Minimal
- Clean
- Fast
- Readable
- Mobile-first
- Large touch targets
- Clear typography
- Limited colors
- Minimal animations
- No unnecessary illustrations
- No excessive cards
- No visual clutter

The user should be able to add a task in a few interactions.

---

# 22. Navigation

Use Expo Router Tabs.

Recommended structure:

```text
app/
├── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── calendar.tsx
│   ├── tasks.tsx
│   └── settings.tsx
│
├── task/
│   ├── new.tsx
│   └── [id].tsx
```

Suggested tab labels:

```text
Today
Calendar
Tasks
Settings
```

---

# 23. Suggested Project Structure

```text
src/
├── components/
│   ├── TaskItem.tsx
│   ├── TaskCard.tsx
│   ├── EmptyState.tsx
│   ├── ProgressIndicator.tsx
│   └── DateHeader.tsx
│
├── database/
│   ├── database.ts
│   ├── migrations.ts
│   └── taskRepository.ts
│
├── notifications/
│   └── notificationService.ts
│
├── hooks/
│   ├── useTasks.ts
│   └── useNotifications.ts
│
├── utils/
│   ├── dateUtils.ts
│   ├── recurrence.ts
│   └── taskUtils.ts
│
├── constants/
│   └── appConstants.ts
│
└── types/
    └── task.ts
```

The exact structure may be adjusted to fit the Expo project template, but the codebase should remain modular and easy to maintain.

---

# 24. Core User Flow

## Add Task

```text
Open App
   ↓
Today
   ↓
Tap Add Task
   ↓
Enter Title
   ↓
Select Date
   ↓
Select Time
   ↓
Select Reminder
   ↓
Optional Priority / Category / Repeat
   ↓
Save
   ↓
Task appears in Today/Tasks
   ↓
Local notification scheduled
```

## Complete Task

```text
Open Today
   ↓
Find Task
   ↓
Tap Checkbox
   ↓
Task marked complete
   ↓
Strike-through applied
   ↓
Notification cancelled
   ↓
Remaining count decreases
```

---

# 25. Empty States

## No Tasks Today

Display:

```text
You're all caught up
```

Optionally show a small secondary message:

```text
No tasks scheduled for today.
```

## No Active Tasks

Display:

```text
No active tasks
```

## No Completed Tasks

Display:

```text
No completed tasks yet
```

Avoid unnecessary illustrations.

---

# 26. Error Handling

The app must handle failures gracefully.

Examples:

### Notification Permission Denied

Do not crash.

Show a clear message explaining that reminders require notification permission.

### Database Error

Show a user-friendly error state.

Do not expose raw SQL errors.

### Invalid Task

Prevent saving if required fields are missing.

Examples:

- Empty title
- Invalid date
- Invalid time

### Notification Scheduling Failure

The task should still be saved.

The UI should not lose the task simply because notification scheduling failed.

---

# 27. Offline Requirements

The following functionality must work without internet:

- Opening the app
- Viewing tasks
- Creating tasks
- Editing tasks
- Deleting tasks
- Completing tasks
- Calendar
- Settings
- Profile editing
- Theme switching
- Local notification scheduling
- Local notification display

No screen should require an API call.

---

# 28. Permissions

Keep permissions minimal.

Expected Android permission:

- Notifications

Do not request:

- Location
- Contacts
- Camera
- Microphone
- Storage access

unless a future feature explicitly requires them.

---

# 29. Performance Requirements

The application should:

- Launch quickly.
- Use minimal memory.
- Avoid unnecessary background processes.
- Avoid unnecessary animations.
- Avoid network calls.
- Keep database queries efficient.
- Avoid loading the entire task history when only today's tasks are required.

The app should remain responsive with a large number of locally stored tasks.

---

# 30. Security and Privacy

Because the application is local-only:

- No user account is required.
- No personal data is sent to a server.
- No analytics should be included in V1.
- No tracking should be included in V1.
- No third-party cloud database should be used.

All task/profile information remains on the user's device.

---

# 31. V1 Feature Checklist

## Profile

- [ ] First-launch profile setup
- [ ] Name
- [ ] Designation
- [ ] Local profile storage
- [ ] Edit profile from Settings

## Today

- [ ] Time-based greeting
- [ ] Personalized name/designation
- [ ] Remaining task count
- [ ] Today's task list
- [ ] Completed task strike-through
- [ ] Empty state

## Tasks

- [ ] Create task
- [ ] Edit task
- [ ] Delete task
- [ ] Complete task
- [ ] Undo completion
- [ ] Priority
- [ ] Category
- [ ] Description
- [ ] Repeat
- [ ] Overdue state

## Calendar

- [ ] Monthly calendar
- [ ] Task indicators
- [ ] Date selection
- [ ] Tasks for selected date

## Notifications

- [ ] Local notification scheduling
- [ ] Reminder timing
- [ ] Notification permission
- [ ] Notification ON/OFF
- [ ] Cancel notification on completion
- [ ] Cancel notification on deletion
- [ ] Reschedule after task editing
- [ ] Reschedule when notifications are enabled

## Appearance

- [ ] System theme
- [ ] Light theme
- [ ] Dark theme

## Offline

- [ ] No backend
- [ ] No authentication
- [ ] No internet dependency
- [ ] SQLite local storage

---

# 32. Future Features

These features are intentionally excluded from V1 but may be added later.

### Voice Input

Example:

```text
"Remind me to submit attendance at 4 PM."
```

The app could convert the voice command into a task.

### Diary Scanning

Allow the user to scan a handwritten or printed diary/calendar and extract tasks.

### Offline OCR

Use on-device OCR without requiring a cloud API.

### Offline AI Assistant

A local AI assistant could help create or organize tasks.

### Backup and Restore

Allow users to export/import their local task database.

### Calendar Integration

Potential integration with Android/Google Calendar.

### Advanced Recurrence

Support:

- Specific weekdays
- Custom intervals
- End dates
- Multiple reminders
- Exception dates

---

# 33. Acceptance Criteria

The V1 release is considered successful when:

1. The APK installs and runs on Android.
2. The app works without internet access.
3. No login is required.
4. The first launch asks for name and designation.
5. The profile is remembered after closing/reopening the app.
6. The Today screen displays the correct time-based greeting.
7. The Today screen displays the correct incomplete-task count.
8. Users can create, edit, delete, and complete tasks.
9. Completed tasks remain visible and are struck through.
10. Overdue tasks are clearly identified.
11. Local reminders can be scheduled.
12. Notifications can be turned ON/OFF.
13. Turning notifications OFF cancels scheduled reminders without deleting reminder configuration.
14. Turning notifications ON reschedules eligible reminders.
15. The Calendar screen displays task dates.
16. Light, Dark, and System themes work.
17. All core data persists after app restart.
18. No backend or cloud service is required.
19. No unnecessary permissions are requested.
20. The app remains lightweight and responsive.

---

# 34. V1 Product Principle

The core philosophy of the application is:

> **Open. See what needs to be done. Get reminded. Complete it. Move on.**

The app should avoid unnecessary complexity and remain a lightweight offline task manager specifically designed for teachers and faculty members.

---

# Version 1.1: Faculty Flow

Version 1.1 is a polish-and-extend release. Every V1 requirement above still applies.

## Name and identity

- The app is now called **Faculty Flow** (display name, About screen, README). The Android
  package id is `com.facultyflow.app` and the deep-link scheme is `facultyflow`. Version 1.1.0,
  versionCode 2.
- New brand mark: an open book with a flowing checkmark, deep teal `#0F766E` (the in-app accent
  later moved to green `#0A7A4B`, see "Remind me and bottom bar" below). Icon, adaptive icon
  (with an Android 13+ monochrome layer), splash (light and dark) and notification icon are
  generated by `scripts/generate-assets.mjs`.

## Designation and greeting

- Designations: Teacher, Assistant Professor, Associate Professor, Professor, **HOD**, Faculty,
  Other (Other accepts a custom value).
- Greeting: "Good Morning, Professor Sanskar", "Good Morning, HOD Sanskar",
  "Good Morning, Teacher Sanskar". For Faculty, Other and custom designations only the name is used:
  "Good Morning, Sanskar".

## UI

- One design system (`src/theme/theme.ts`): neutral greys, one accent, red for overdue and high
  priority, amber for medium, green for completed; spacing, radius and type scales.
- No emojis anywhere. One icon family (Feather) for tabs, rows, chips and empty states.
- Today: greeting header, "N tasks left today" with a thin progress bar, task rows with a round
  checkbox, time, Overdue label, and priority/category chips.
- Add/Edit task: grouped sections (When, Reminder, Details), icon rows, segmented Priority,
  sticky Save button.
- Calendar: cleaner month grid, today highlighted, selected day filled with the accent, dots on
  days with tasks.
- Settings: grouped rows with icons, switches and radio choices.
- New themed bottom-sheet **time picker** (hour, minute in 5-minute steps or any minute, AM/PM,
  presets: Now + 1 hr, 9:00 AM, 12:00 PM, 4:00 PM) and a matching **date picker**. Times are still
  stored as local 24-hour `HH:mm` and shown in 12-hour format.

## Alarm-style reminders

Settings, Reminders gains **Reminder style** (active only when Task Reminders is ON):

- **Notification** (default, and what existing users keep): the V1 behaviour.
- **Alarm alert**: rings on the alarm audio stream until the user acts (stops after 10 minutes),
  vibrates, and shows a full-screen alert over the lock screen with **Done** (completes the task),
  **Snooze** (5/10/15 minutes, chosen in Settings) and **Dismiss** (task stays open). Simultaneous
  alarms are queued and shown one at a time.

Rules shared with notifications: completing, deleting or editing a task cancels or reschedules
its alarm; recurring tasks schedule only the next occurrence; reminders are restored after reboot
and reconciled on every launch; the master switch OFF cancels everything without changing task
settings.

Permissions are explained in-app before anything is requested. *Check alarm permissions* shows
notification, alarm channel, exact alarm, full-screen intent (Android 14+) and battery status, and
opens the matching system screen. Without full-screen or exact-alarm permission the alert falls
back to a ringing high-priority notification. A **Test alarm** button rings about 10 seconds
later. A battery tip covers phone makers that block alarms.

Implementation: a small local Expo module (`modules/faculty-alarm`, Kotlin) using
`AlarmManager.setAlarmClock`, an alarm-sound notification channel and a native full-screen
activity. Notifee was not used: it was archived in April 2026, and its channels cannot put the
sound on the alarm stream.

## Data

- Migration v2 adds `reminder_style` (default `notification`) and `snooze_minutes` (default 5)
  to the `settings` table. Tasks and profile are unchanged and survive the update.

## Remind me and bottom bar

- **Remind me switch** on Add/Edit task (bell icon, above the timing). Default ON, 10 minutes
  before. OFF hides the timing and saves a note-only task; switching back ON on the same screen
  restores the timing chosen before. "No reminder" was removed from the timing list.
- A task has a reminder if and only if `reminderMinutes` is not null; no new column. Existing
  tasks with `reminder_minutes = NULL` become note-only without a migration.
- Note-only tasks never schedule a notification or alarm: creating, editing, recurrence advance,
  the master switch, launch reconcile and alarm snooze all skip them. Editing ON to OFF cancels the
  scheduled reminder and clears its id; OFF to ON schedules one if the time is in the future and
  reminders are on. Note-only tasks still appear everywhere and count as normal tasks.
- Task rows show a small muted bell next to the time only for tasks with a reminder.
- **Bottom bar:** a floating white pill (about 68dp tall, 14dp side margins, 1dp `#DDDDDD` border,
  soft shadow) above the system navigation area, with Today, Calendar, Tasks and Settings (Feather
  icons over labels). The active tab sits on a mint pill `#E3F1EA` with green `#0A7A4B` icon and bold
  label; dark mode uses `#1C2420` / `#1F3A2D` / `#7BD9A8`. No animation. Hidden while the keyboard is
  open; not shown on Add/Edit task screens.
- The app's accent colour is now that green (switches, buttons, selections, calendar). Red stays
  for overdue and high priority.
