// Alarm-style reminders (Android only). Native code: ./android/src/main/java/expo/modules/facultyalarm
import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface AlarmSpec {
  /** Stable id; scheduling the same id again replaces the alarm. */
  id: string;
  taskId: string | null;
  /** The task date this alarm belongs to ("YYYY-MM-DD"), so a late "Done" can't complete a later occurrence. */
  occurrence: string | null;
  title: string;
  timeText: string;
  detailText: string;
  /** Epoch milliseconds. */
  triggerAt: number;
  /**
   * Recurring tasks: the following occurrences (epoch ms + task date, same length). "Done" on
   * the alarm screen arms the next one natively, even if the app is not opened.
   */
  upcomingTriggers: number[];
  upcomingDates: string[];
}

export type AlarmStatus = 'scheduled' | 'ringing' | 'queued' | 'snoozed';

export interface StoredAlarm {
  id: string;
  taskId: string | null;
  occurrence: string | null;
  status: AlarmStatus;
}

export interface AlarmPermissionStatus {
  notificationsEnabled: boolean;
  channelEnabled: boolean;
  fullScreenAllowed: boolean;
  exactAlarmsAllowed: boolean;
  batteryUnrestricted: boolean;
  sdkInt: number;
}

export type AlarmSettingsScreen = 'fullScreen' | 'exactAlarm' | 'battery' | 'channel' | 'notifications';

declare class FacultyAlarmModule extends NativeModule<{ onAlarmDone: () => void }> {
  schedule(spec: AlarmSpec): Promise<boolean>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  getAlarms(): Promise<StoredAlarm[]>;
  takePendingDone(): Promise<{ taskId: string; occurrence: string | null }[]>;
  setSnoozeMinutes(minutes: number): Promise<void>;
  getStatus(): Promise<AlarmPermissionStatus>;
  openSettings(screen: AlarmSettingsScreen): Promise<void>;
}

/** Null in Expo Go or any build without the native module (then the app falls back to notifications). */
export default requireOptionalNativeModule<FacultyAlarmModule>('FacultyAlarm');
