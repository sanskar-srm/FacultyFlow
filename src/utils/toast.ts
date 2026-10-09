import { ToastAndroid } from 'react-native';

/** A short, non-blocking message at the bottom of the screen. */
export function showToast(message: string) {
  ToastAndroid.show(message, ToastAndroid.LONG);
}
