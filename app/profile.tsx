import { router } from 'expo-router';
import { ProfileForm } from '@/src/components/ProfileForm';
import { useApp } from '@/src/context/AppContext';

export default function EditProfileScreen() {
  const { profile, saveProfile } = useApp();
  return (
    <ProfileForm
      initial={profile}
      submitLabel="Save"
      onSubmit={async (p) => {
        await saveProfile(p);
        router.back();
      }}
    />
  );
}
