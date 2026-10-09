import { ProfileForm } from '@/src/components/ProfileForm';
import { useApp } from '@/src/context/AppContext';
import { requestNotificationPermission } from '@/src/notifications/notificationService';
import type { Profile } from '@/src/types/task';

/** First launch only: save profile → ask for notification permission → Today. */
export default function SetupScreen() {
  const { saveProfile } = useApp();

  const onSubmit = async (profile: Profile) => {
    // Saving unlocks the tabs; the system permission prompt then appears over Today.
    await saveProfile(profile);
    requestNotificationPermission().catch(() => {
      // Declining or failing is fine: the app works without reminders.
    });
  };

  return (
    <ProfileForm
      intro="Let's set up your planner. Everything stays on your phone."
      submitLabel="Continue"
      onSubmit={onSubmit}
    />
  );
}
