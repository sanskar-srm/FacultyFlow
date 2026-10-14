import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { Chip, SegmentedControl } from '@/src/components/Controls';
import { Icon } from '@/src/components/Icon';
import { ListGroup, ListRow, RadioRow, SwitchRow } from '@/src/components/ListGroup';
import {
  APP_NAME,
  REMINDER_STYLE_OPTIONS,
  SNOOZE_OPTIONS,
  THEME_OPTIONS,
} from '@/src/constants/appConstants';
import { useApp } from '@/src/context/AppContext';
import {
  alarmsAvailable,
  getAlarmStatus,
  openAlarmSettings,
  scheduleTestAlarm,
  type AlarmPermissionStatus,
  type AlarmSettingsScreen,
} from '@/src/notifications/alarmService';
import { getNotificationPermission, requestNotificationPermission } from '@/src/notifications/notificationService';
import { radius, space, type, useColors } from '@/src/theme/theme';
import type { ReminderStyle } from '@/src/types/task';
import { showToast } from '@/src/utils/toast';

const PRIVACY_POLICY = [
  `All of your data, including tasks, reminders, your profile and settings, is stored locally on this phone.`,
  `Nothing leaves your phone. ${APP_NAME} does not collect, upload, share or sell any information.`,
  `The app is completely offline and is not connected to the internet. There are no accounts, no analytics and no tracking.`,
  `Uninstalling the app removes all of its data from your phone.`,
];

type Permission = { granted: boolean; canAskAgain: boolean } | null;

interface Requirement {
  key: AlarmSettingsScreen;
  label: string;
  detail: string;
  ok: boolean;
  required: boolean;
}

function requirements(s: AlarmPermissionStatus): Requirement[] {
  const list: Requirement[] = [
    { key: 'notifications', label: 'Notifications', detail: 'Needed for any reminder to appear.', ok: s.notificationsEnabled, required: true },
    { key: 'channel', label: 'Alarm alert sound', detail: 'The "Alarm alerts" notification category must be on.', ok: s.channelEnabled, required: true },
    { key: 'exactAlarm', label: 'Alarms and reminders', detail: 'Rings on the exact minute, even in battery saver.', ok: s.exactAlarmsAllowed, required: true },
  ];
  if (s.sdkInt >= 34) {
    list.push({ key: 'fullScreen', label: 'Full-screen alerts', detail: 'Shows the alert over the lock screen.', ok: s.fullScreenAllowed, required: true });
  }
  list.push({
    key: 'battery',
    label: 'Battery: Unrestricted',
    detail: 'Recommended. Stops the phone from blocking alarms to save battery.',
    ok: s.batteryUnrestricted,
    required: false,
  });
  return list;
}

export default function SettingsScreen() {
  const c = useColors();
  const app = useApp();
  const { profile, theme, setTheme, remindersEnabled, reminderStyle, snoozeMinutes } = app;
  const [permission, setPermission] = useState<Permission>(null);
  const [alarmStatus, setAlarmStatus] = useState<AlarmPermissionStatus | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const refresh = useCallback(() => {
    getNotificationPermission().then(setPermission).catch(() => setPermission(null));
    if (alarmsAvailable) getAlarmStatus().then(setAlarmStatus).catch(() => setAlarmStatus(null));
  }, []);

  // Re-check on focus and on return from system settings.
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const toggleReminders = async (enabled: boolean) => {
    try {
      await app.setRemindersEnabled(enabled);
      showToast(enabled ? 'Reminders turned on' : 'Reminders turned off');
    } catch {
      showToast("Couldn't update reminders. Please try again.");
    }
  };

  const applyStyle = async (style: ReminderStyle) => {
    try {
      await app.setReminderStyle(style);
      if (style === 'alarm') await requestNotificationPermission().catch(() => false);
      refresh();
      if (style === 'alarm') setCheckOpen(true);
    } catch {
      showToast("Couldn't change the reminder style. Please try again.");
    }
  };

  const chooseStyle = (style: ReminderStyle) => {
    if (style === reminderStyle) return;
    if (style === 'notification') {
      applyStyle(style);
      return;
    }
    // Explain before asking for anything.
    Alert.alert(
      'Use alarm alerts?',
      'Reminders will ring like an alarm, even in silent or vibrate mode, and show a full-screen alert ' +
        'on the lock screen until you choose Done, Snooze or Dismiss.\n\n' +
        'Next you will see what your phone needs to allow (notifications, exact alarms and full-screen alerts).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => applyStyle('alarm') },
      ],
    );
  };

  const allowNotifications = async () => {
    if (permission?.canAskAgain) {
      await requestNotificationPermission().catch(() => false);
      refresh();
    } else {
      Linking.openSettings();
    }
  };

  const testAlarm = async () => {
    try {
      await scheduleTestAlarm();
      showToast('Test alarm in about 10 seconds. Lock your phone to see the full-screen alert.');
    } catch {
      showToast("Couldn't set the test alarm.");
    }
  };

  const alarmMode = remindersEnabled && reminderStyle === 'alarm' && alarmsAvailable;
  const reqs = alarmStatus ? requirements(alarmStatus) : [];
  const missing = reqs.filter((r) => r.required && !r.ok);
  const fallbackNote =
    alarmStatus && (!alarmStatus.fullScreenAllowed || !alarmStatus.exactAlarmsAllowed)
      ? 'Until this is allowed, alarm alerts ring as a high-priority notification' +
        (!alarmStatus.exactAlarmsAllowed ? ' and may arrive a few minutes late.' : ' instead of a full-screen alert.')
      : null;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <ListGroup title="Profile">
        <ListRow
          icon="user"
          label={profile?.name ?? ''}
          detail={profile?.designation}
          onPress={() => router.push('/profile')}
          chevron
        />
      </ListGroup>

      <ListGroup title="Reminders">
        <SwitchRow
          icon="bell"
          label="Task reminders"
          detail={remindersEnabled ? 'On. Tasks remind you before they start.' : 'Off. No reminders will be sent.'}
          value={remindersEnabled}
          onChange={toggleReminders}
        />
      </ListGroup>

      <ListGroup
        title="Reminder style"
        footer={remindersEnabled ? undefined : 'Turn on Task reminders to choose a style.'}>
        {REMINDER_STYLE_OPTIONS.map((o) => (
          <RadioRow
            key={o.value}
            icon={o.icon}
            label={o.label}
            detail={o.value === 'alarm' && !alarmsAvailable ? 'Needs the installed app (not available in Expo Go).' : o.detail}
            selected={(alarmsAvailable ? reminderStyle : 'notification') === o.value}
            disabled={!remindersEnabled || (o.value === 'alarm' && !alarmsAvailable)}
            onPress={() => chooseStyle(o.value)}
          />
        ))}
      </ListGroup>

      {remindersEnabled && permission && !permission.granted ? (
        <Notice
          tone="warning"
          text={`Notifications are blocked for ${APP_NAME}, so reminders cannot appear.`}
          action={permission.canAskAgain ? 'Allow notifications' : 'Open system settings'}
          onAction={allowNotifications}
        />
      ) : null}

      {alarmMode ? (
        <>
          <ListGroup title="Alarm alerts">
            <ListRow
              icon="shield"
              label="Check alarm permissions"
              detail={alarmStatus ? (missing.length === 0 ? 'Everything needed is allowed' : `${missing.length} ${missing.length === 1 ? 'item needs' : 'items need'} attention`) : undefined}
              detailColor={missing.length === 0 ? c.success : c.warning}
              onPress={() => setCheckOpen(true)}
              chevron
            />
            <View style={styles.snooze}>
              <View style={styles.snoozeLabel}>
                <Icon name="moon" size={20} color={c.textMuted} />
                <Text style={[type.body, { color: c.text, fontWeight: '500' }]}>Snooze length</Text>
              </View>
              <SegmentedControl
                label="Snooze length"
                options={SNOOZE_OPTIONS}
                value={snoozeMinutes}
                onChange={(m) => app.setSnoozeMinutes(m).catch(() => showToast("Couldn't save snooze length."))}
              />
            </View>
            <ListRow icon="play-circle" label="Test alarm" detail="Rings in about 10 seconds" onPress={testAlarm} />
            <ListRow
              icon="battery"
              label="Battery optimisation"
              detail="Some phones (Xiaomi, Oppo, Vivo, Realme, Samsung and others) block alarms to save battery. Set this app to Unrestricted and allow Autostart if offered."
              onPress={() => openAlarmSettings('battery').catch(() => Linking.openSettings())}
              chevron
            />
          </ListGroup>
          {fallbackNote ? <Notice tone="warning" text={fallbackNote} action="Fix this" onAction={() => setCheckOpen(true)} /> : null}
        </>
      ) : null}

      <ListGroup title="Data">
        <ListRow
          icon="download"
          label="Export to Excel"
          detail="Save tasks for a day, week, month or custom period as an Excel sheet and share it."
          onPress={() => router.push('/export')}
          chevron
        />
      </ListGroup>

      <ListGroup title="Appearance">
        {THEME_OPTIONS.map((o) => (
          <RadioRow
            key={o.value}
            icon={o.icon}
            label={o.label}
            detail={o.detail}
            selected={theme === o.value}
            onPress={() => setTheme(o.value).catch(() => showToast("Couldn't save the theme."))}
          />
        ))}
      </ListGroup>

      <ListGroup title="About">
        <ListRow icon="check-circle" iconColor={c.primary} label={APP_NAME} value={`Version ${Constants.expoConfig?.version ?? '1.1.0'}`} />
        <ListRow
          icon="lock"
          label="Private by design"
          detail="Your tasks and profile stay on this phone. No account, no internet, no tracking."
        />
        <ListRow icon="file-text" label="Privacy policy" onPress={() => setPrivacyOpen(true)} chevron />
      </ListGroup>

      <Text style={[type.caption, styles.credit, { color: c.textMuted }]}>Made with ❤️ by Sanskar</Text>

      <BottomSheet
        visible={privacyOpen}
        title="Privacy policy"
        onClose={() => setPrivacyOpen(false)}
        footer={<View style={styles.flex}><Button label="Close" variant="secondary" onPress={() => setPrivacyOpen(false)} /></View>}>
        {PRIVACY_POLICY.map((p) => (
          <Text key={p} style={[type.body, styles.policyText, { color: c.text }]}>{p}</Text>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={checkOpen}
        title="Alarm permissions"
        onClose={() => setCheckOpen(false)}
        footer={<View style={styles.flex}><Button label="Close" variant="secondary" onPress={() => setCheckOpen(false)} /></View>}>
        <Text style={[type.body, styles.sheetIntro, { color: c.textMuted }]}>
          Tap anything that is not allowed yet to open the right system screen, allow it, then come back.
        </Text>
        <View style={[styles.sheetList, { borderColor: c.border }]}>
          {reqs.map((r, i) => (
            <View key={r.key} style={i > 0 ? [styles.sheetDivider, { borderTopColor: c.border }] : undefined}>
              <ListRow
                icon={r.ok ? 'check-circle' : r.required ? 'alert-circle' : 'info'}
                iconColor={r.ok ? c.success : r.required ? c.warning : c.textMuted}
                label={r.label}
                detail={r.detail}
                right={<Chip label={r.ok ? 'Allowed' : r.required ? 'Open' : 'Optional'} tone={r.ok ? 'success' : r.required ? 'warning' : 'neutral'} />}
                onPress={r.ok ? undefined : () => openAlarmSettings(r.key).catch(() => Linking.openSettings())}
              />
            </View>
          ))}
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function Notice({ text, action, onAction, tone }: { text: string; action?: string; onAction?: () => void; tone: 'warning' }) {
  const c = useColors();
  const fg = tone === 'warning' ? c.warning : c.text;
  return (
    <View style={[styles.notice, { backgroundColor: c.warningSoft }]}>
      <Icon name="alert-triangle" size={18} color={fg} />
      <View style={styles.flex}>
        <Text style={[type.body, { color: c.text }]}>{text}</Text>
        {action && onAction ? (
          <Text onPress={onAction} style={[type.body, styles.noticeAction, { color: fg }]} accessibilityRole="button">
            {action}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  snooze: { padding: space.lg, gap: space.md },
  snoozeLabel: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  notice: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, marginTop: space.md },
  noticeAction: { fontWeight: '700', marginTop: space.sm, paddingVertical: space.xs },
  sheetIntro: { marginBottom: space.md },
  policyText: { marginBottom: space.md },
  credit: { textAlign: 'center', marginTop: space.xl },
  sheetList: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden' },
  sheetDivider: { borderTopWidth: StyleSheet.hairlineWidth },
});
