import * as Font from 'expo-font';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, AppState as RNAppState } from 'react-native';
import { ICON_FONT } from '@/src/components/Icon';
import * as settings from '@/src/database/settingsRepository';
import { onAlarmDone, setNativeSnoozeMinutes } from '@/src/notifications/alarmService';
import { ensureReminderChannel } from '@/src/notifications/notificationService';
import {
  applyAlarmDone,
  reconcileReminders,
  setReminderStyle as applyReminderStyle,
  setRemindersEnabled as applyRemindersEnabled,
  setSnoozeMinutes as applySnoozeMinutes,
} from '@/src/services/taskService';
import type { Profile, ReminderStyle, ThemePreference } from '@/src/types/task';

interface AppState {
  profile: Profile | null;
  theme: ThemePreference;
  remindersEnabled: boolean;
  reminderStyle: ReminderStyle;
  snoozeMinutes: number;
  saveProfile: (p: Profile) => Promise<void>;
  setTheme: (t: ThemePreference) => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  setReminderStyle: (style: ReminderStyle) => Promise<void>;
  setSnoozeMinutes: (minutes: number) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

function applyTheme(theme: ThemePreference) {
  Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready' };

/** Loads profile and settings from SQLite once, then keeps them in memory. */
export function AppProvider({ children, fallback }: {
  children: ReactNode;
  fallback: (state: 'loading' | 'error', retry: () => void) => ReactNode;
}) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [remindersEnabled, setRemindersState] = useState(true);
  const [reminderStyle, setStyleState] = useState<ReminderStyle>('notification');
  const [snoozeMinutes, setSnoozeState] = useState(5);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, t, r, style, snooze] = await Promise.all([
          settings.getProfile(),
          settings.getThemePreference(),
          settings.getRemindersEnabled(),
          settings.getReminderStyle(),
          settings.getSnoozeMinutes(),
          // Icons render blank until their font is loaded; it is a small local file.
          Font.loadAsync(ICON_FONT).catch(() => {}),
        ]);
        if (cancelled) return;
        applyTheme(t);
        setProfile(p);
        setThemeState(t);
        setRemindersState(r);
        setStyleState(style);
        setSnoozeState(snooze);
        setLoad({ status: 'ready' });
        setNativeSnoozeMinutes(snooze).catch(() => {});
      } catch {
        if (!cancelled) setLoad({ status: 'error' });
        return;
      }
      // Reminder setup never blocks the app.
      applyAlarmDone()
        .catch(() => {})
        .then(() => ensureReminderChannel())
        .then(() => reconcileReminders())
        .catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // "Done" pressed on the alarm screen: apply it now if the app is running, or on return.
  useEffect(() => {
    if (load.status !== 'ready') return;
    const unsubscribe = onAlarmDone(() => {
      applyAlarmDone().catch(() => {});
    });
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') applyAlarmDone().catch(() => {});
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [load.status]);

  if (load.status !== 'ready') {
    return fallback(load.status, () => {
      setLoad({ status: 'loading' });
      setAttempt((a) => a + 1);
    });
  }

  const value: AppState = {
    profile,
    theme,
    remindersEnabled,
    reminderStyle,
    snoozeMinutes,
    saveProfile: async (p) => {
      await settings.saveProfile(p);
      setProfile(p);
    },
    setTheme: async (t) => {
      applyTheme(t);
      setThemeState(t);
      await settings.setThemePreference(t);
    },
    setRemindersEnabled: async (enabled) => {
      setRemindersState(enabled);
      try {
        await applyRemindersEnabled(enabled);
      } catch (e) {
        setRemindersState(!enabled);
        throw e;
      }
    },
    setReminderStyle: async (style) => {
      const previous = reminderStyle;
      setStyleState(style);
      try {
        await applyReminderStyle(style);
      } catch (e) {
        setStyleState(previous);
        throw e;
      }
    },
    setSnoozeMinutes: async (minutes) => {
      setSnoozeState(minutes);
      await applySnoozeMinutes(minutes);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
