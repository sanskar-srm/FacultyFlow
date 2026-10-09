import type { Profile } from '@/src/types/task';
import { dayPeriod } from './dateUtils';

// Designations that read naturally as a title before the name ("Professor Sanskar").
// "Faculty", "Other" and custom designations are not titles, so only the name is used.
const TITLES = ['Teacher', 'Assistant Professor', 'Associate Professor', 'Professor', 'HOD'];

/** "Professor Sanskar", "HOD Sanskar", or just "Sanskar" when the designation is not a title. */
export function addressName(profile: Profile): string {
  const name = profile.name.trim();
  const title = TITLES.find((t) => t.toLowerCase() === profile.designation.trim().toLowerCase());
  return title ? `${title} ${name}` : name;
}

/** "Good Morning, Professor Sanskar" */
export function greeting(profile: Profile | null, now: Date = new Date()): string {
  const hello = `Good ${dayPeriod(now)}`;
  return profile ? `${hello}, ${addressName(profile)}` : hello;
}
