package expo.modules.facultyalarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmSpecRecord : Record {
  @Field val id: String = ""
  @Field val taskId: String? = null
  @Field val occurrence: String? = null
  @Field val title: String = ""
  @Field val timeText: String = ""
  @Field val detailText: String = ""
  @Field val triggerAt: Double = 0.0
  /** Following occurrences of a recurring task: epoch ms and task date, same length. */
  @Field val upcomingTriggers: List<Double> = emptyList()
  @Field val upcomingDates: List<String> = emptyList()
}

/** JS bridge for alarm-style reminders. All state lives in [AlarmStore]; see [Alarms]. */
class FacultyAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FacultyAlarm")

    Events("onAlarmDone")

    OnCreate {
      appContext.reactContext?.let { Alarms.ensureChannel(it) }
      Alarms.onDone = { this@FacultyAlarmModule.sendEvent("onAlarmDone", emptyMap<String, Any>()) }
    }

    OnDestroy {
      Alarms.onDone = null
    }

    /** Arms (or replaces) an alarm. Resolves true when it is exact, false for the inexact fallback. */
    AsyncFunction("schedule") { r: AlarmSpecRecord ->
      Alarms.schedule(
        context,
        AlarmSpec(
          id = r.id,
          taskId = r.taskId,
          occurrence = r.occurrence,
          title = r.title,
          timeText = r.timeText,
          detailText = r.detailText,
          triggerAt = r.triggerAt.toLong(),
          upcoming = r.upcomingTriggers.map { it.toLong() }.zip(r.upcomingDates),
        ),
      )
    }

    AsyncFunction("cancel") { id: String -> Alarms.cancel(context, id) }

    AsyncFunction("cancelAll") { Alarms.cancelAll(context) }

    /** Every stored alarm with its status (scheduled, ringing, queued, snoozed). */
    AsyncFunction("getAlarms") {
      AlarmStore.get(context).all().map {
        mapOf("id" to it.id, "taskId" to it.taskId, "occurrence" to it.occurrence, "status" to it.status)
      }
    }

    /** Returns and clears "Done" presses from the alarm screen that the app has not applied yet. */
    AsyncFunction("takePendingDone") {
      AlarmStore.get(context).takePendingDone().map { (taskId, occurrence) ->
        mapOf("taskId" to taskId, "occurrence" to occurrence)
      }
    }

    AsyncFunction("setSnoozeMinutes") { minutes: Int ->
      AlarmStore.get(context).snoozeMinutes = minutes.coerceIn(1, 60)
    }

    AsyncFunction("getStatus") {
      val ctx = context
      val nm = ctx.getSystemService(NotificationManager::class.java)
      val channelOn = Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
        (nm.getNotificationChannel(Alarms.CHANNEL_ID)?.importance ?: NotificationManager.IMPORTANCE_HIGH) !=
        NotificationManager.IMPORTANCE_NONE
      mapOf(
        "notificationsEnabled" to NotificationManagerCompat.from(ctx).areNotificationsEnabled(),
        "channelEnabled" to channelOn,
        "fullScreenAllowed" to (Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent()),
        "exactAlarmsAllowed" to Alarms.canScheduleExact(ctx),
        "batteryUnrestricted" to ctx.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(ctx.packageName),
        "sdkInt" to Build.VERSION.SDK_INT,
      )
    }

    /** Opens the system screen where the user can fix one alarm requirement. */
    AsyncFunction("openSettings") { kind: String ->
      val ctx = context
      val pkg = Uri.parse("package:${ctx.packageName}")
      val intent = when (kind) {
        "fullScreen" ->
          if (Build.VERSION.SDK_INT >= 34) Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg) else null
        "exactAlarm" ->
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg) else null
        "battery" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        "channel" ->
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
              .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
              .putExtra(Settings.EXTRA_CHANNEL_ID, Alarms.CHANNEL_ID)
          } else null
        "notifications" ->
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
          } else null
        else -> null
      } ?: Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
      val launch = intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        ctx.startActivity(launch)
      } catch (_: Exception) {
        // Some phones hide a settings screen; fall back to the app's details page.
        ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
  }
}
