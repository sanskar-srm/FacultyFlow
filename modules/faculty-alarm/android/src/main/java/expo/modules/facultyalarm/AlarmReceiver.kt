package expo.modules.facultyalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarm time reached, or Done / Snooze / Dismiss pressed on the notification. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(Alarms.EXTRA_ID) ?: return
    when (val action = intent.action) {
      Alarms.ACTION_FIRE -> Alarms.fire(context, id)
      Alarms.ACTION_DONE, Alarms.ACTION_SNOOZE, Alarms.ACTION_DISMISS -> Alarms.handleAction(context, action, id)
    }
  }
}

/** Alarms do not survive a reboot or an app update on their own; re-arm them from storage. */
class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      Alarms.restore(context)
    }
  }
}
