package expo.modules.facultyalarm

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Schedules, shows and resolves alarm alerts.
 *
 * - Timing: AlarmManager.setAlarmClock (exact, allowed in Doze). Falls back to an inexact
 *   alarm when the exact-alarm permission is missing.
 * - Sound: a notification channel whose sound plays on the ALARM audio stream and repeats
 *   (FLAG_INSISTENT) until the user acts, so no foreground service is needed.
 * - Screen: a full-screen intent opens [AlarmActivity] on a locked or sleeping phone. If Android
 *   does not allow full-screen intents, the same notification still rings as a heads-up alert.
 * - One alert at a time: alarms that fire while another is showing wait in a queue.
 */
object Alarms {
  private const val TAG = "FacultyAlarm"
  const val CHANNEL_ID = "alarm_alerts"
  private const val NOTIFICATION_ID = 7301
  private const val RING_TIMEOUT_MS = 10 * 60 * 1000L
  /** Alarms missed while the phone was off still ring after boot if they are this recent. */
  private const val MISSED_GRACE_MS = 30 * 60 * 1000L

  const val ACTION_FIRE = "expo.modules.facultyalarm.FIRE"
  const val ACTION_DONE = "expo.modules.facultyalarm.DONE"
  const val ACTION_SNOOZE = "expo.modules.facultyalarm.SNOOZE"
  const val ACTION_DISMISS = "expo.modules.facultyalarm.DISMISS"
  const val EXTRA_ID = "alarmId"

  /** Called when a "Done" press is stored, so a running app can apply it right away. */
  @Volatile var onDone: (() -> Unit)? = null

  // --- channel ---------------------------------------------------------------------------------

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val channel = NotificationChannel(CHANNEL_ID, "Alarm alerts", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Task reminders that ring like an alarm until you respond"
      setSound(
        sound,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 800, 600, 800, 600)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    nm.createNotificationChannel(channel)
  }

  // --- scheduling ------------------------------------------------------------------------------

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
  }

  /** Stores and arms the alarm, replacing any alarm with the same id. Returns true when exact. */
  fun schedule(context: Context, spec: AlarmSpec): Boolean {
    val store = AlarmStore.get(context)
    val wasCurrent = store.current() == spec.id
    store.remove(spec.id)
    store.put(spec)
    val exact = arm(context, spec)
    if (wasCurrent) {
      silence(context)
      store.setCurrent(null)
      AlarmActivity.close(spec.id)
      showNext(context)
    }
    return exact
  }

  private fun arm(context: Context, spec: AlarmSpec): Boolean {
    val am = context.getSystemService(AlarmManager::class.java)
    val fire = firePendingIntent(context, spec.id)
    return if (canScheduleExact(context)) {
      // The "show" intent is what the system clock UI opens for the upcoming alarm.
      am.setAlarmClock(AlarmManager.AlarmClockInfo(spec.triggerAt, activityPendingIntent(context, spec.id)), fire)
      true
    } else {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, spec.triggerAt, fire)
      false
    }
  }

  fun cancel(context: Context, id: String) {
    val store = AlarmStore.get(context)
    context.getSystemService(AlarmManager::class.java).cancel(firePendingIntent(context, id))
    val wasCurrent = store.current() == id
    store.remove(id)
    if (wasCurrent) {
      silence(context)
      store.setCurrent(null)
      AlarmActivity.close(id)
      showNext(context)
    }
  }

  fun cancelAll(context: Context) {
    val store = AlarmStore.get(context)
    val am = context.getSystemService(AlarmManager::class.java)
    store.all().forEach { am.cancel(firePendingIntent(context, it.id)) }
    silence(context)
    store.current()?.let { AlarmActivity.close(it) }
    store.clear()
  }

  /** After a reboot or app update: re-arm future alarms, ring recently missed ones, drop the rest. */
  fun restore(context: Context) {
    ensureChannel(context)
    val store = AlarmStore.get(context)
    val now = System.currentTimeMillis()
    store.setCurrent(null)
    for (spec in store.all()) {
      when {
        spec.triggerAt > now -> arm(context, spec.copy(status = AlarmSpec.STATUS_SCHEDULED))
        now - spec.triggerAt < MISSED_GRACE_MS -> fire(context, spec.id)
        else -> store.remove(spec.id)
      }
    }
  }

  // --- showing ---------------------------------------------------------------------------------

  fun fire(context: Context, id: String) {
    Log.i(TAG, "fire $id")
    val store = AlarmStore.get(context)
    val spec = store.get(id) ?: return
    val current = store.current()
    if (current != null && current != id && isShowing(context)) {
      store.put(spec.copy(status = AlarmSpec.STATUS_QUEUED))
      store.enqueue(id)
      return
    }
    show(context, spec)
  }

  private fun show(context: Context, spec: AlarmSpec) {
    ensureChannel(context)
    val store = AlarmStore.get(context)
    store.put(spec.copy(status = AlarmSpec.STATUS_RINGING))
    store.setCurrent(spec.id)

    val open = activityPendingIntent(context, spec.id)
    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(spec.title)
      .setContentText(listOf(spec.timeText, spec.detailText).filter { it.isNotBlank() }.joinToString("  |  "))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(false)
      .setTimeoutAfter(RING_TIMEOUT_MS)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      // No delete intent: Android can deliver it when the app itself cancels the alert, which
      // would wipe out a snooze. A swiped-away alert simply stops ringing; the task is untouched.
      .addAction(0, "Done", actionPendingIntent(context, ACTION_DONE, spec.id))
      .addAction(0, "Snooze ${store.snoozeMinutes} min", actionPendingIntent(context, ACTION_SNOOZE, spec.id))
      .addAction(0, "Dismiss", actionPendingIntent(context, ACTION_DISMISS, spec.id))
    accentColor(context)?.let { builder.setColor(it) }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      // Pre-channel Android: sound and vibration go on the notification itself.
      @Suppress("DEPRECATION")
      builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), android.media.AudioManager.STREAM_ALARM)
        .setVibrate(longArrayOf(0, 800, 600, 800, 600))
    }
    val notification = builder.build().apply { flags = flags or Notification.FLAG_INSISTENT }
    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Notification permission denied: nothing can be shown. JS reports this in Settings.
    }
  }

  private fun isShowing(context: Context): Boolean =
    context.getSystemService(NotificationManager::class.java).activeNotifications.any { it.id == NOTIFICATION_ID }

  private fun silence(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  private fun showNext(context: Context) {
    val store = AlarmStore.get(context)
    while (true) {
      val id = store.dequeue() ?: return
      val spec = store.get(id) ?: continue
      show(context, spec)
      return
    }
  }

  // --- user actions ----------------------------------------------------------------------------

  /**
   * `known` is the alert screen's copy of the alarm, used if the stored one is already gone
   * (for example the ring timed out), so a late "Done" still completes the task.
   */
  fun handleAction(context: Context, action: String, id: String, known: AlarmSpec? = null) {
    Log.i(TAG, "action $action for $id")
    val store = AlarmStore.get(context)
    val spec = store.get(id) ?: known
    silence(context)
    if (store.current() == id) store.setCurrent(null)
    AlarmActivity.close(id)

    if (spec != null) {
      when (action) {
        ACTION_DONE -> {
          store.remove(id)
          if (spec.taskId != null) {
            store.addPendingDone(spec.taskId, spec.occurrence)
            // Arm the next future occurrence of a recurring task now; JS confirms it later.
            val now = System.currentTimeMillis()
            val rest = spec.upcoming.dropWhile { it.first <= now }
            rest.firstOrNull()?.let { (at, date) ->
              schedule(
                context,
                spec.copy(triggerAt = at, occurrence = date, upcoming = rest.drop(1), status = AlarmSpec.STATUS_SCHEDULED),
              )
            }
            onDone?.invoke()
          }
        }
        ACTION_SNOOZE -> {
          val snoozed = spec.copy(
            triggerAt = System.currentTimeMillis() + store.snoozeMinutes * 60_000L,
            status = AlarmSpec.STATUS_SNOOZED,
          )
          store.put(snoozed)
          arm(context, snoozed)
        }
        // Dismiss: the task stays as it is; only this alert goes away.
        else -> store.remove(id)
      }
    }
    showNext(context)
  }

  // --- intents and resources -------------------------------------------------------------------

  private const val IMMUTABLE = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

  private fun firePendingIntent(context: Context, id: String): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      Intent(context, AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id),
      IMMUTABLE,
    )

  private fun actionPendingIntent(context: Context, action: String, id: String): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      (action + id).hashCode(),
      Intent(context, AlarmReceiver::class.java).setAction(action).putExtra(EXTRA_ID, id),
      IMMUTABLE,
    )

  fun activityPendingIntent(context: Context, id: String): PendingIntent =
    PendingIntent.getActivity(
      context,
      ("open$id").hashCode(),
      Intent(context, AlarmActivity::class.java)
        .putExtra(EXTRA_ID, id)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
      IMMUTABLE,
    )

  private fun smallIcon(context: Context): Int {
    val res = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (res != 0) res else context.applicationInfo.icon
  }

  private fun accentColor(context: Context): Int? {
    val res = context.resources.getIdentifier("notification_icon_color", "color", context.packageName)
    return if (res != 0) context.getColor(res) else null
  }
}
