package expo.modules.facultyalarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * One alarm as JS scheduled it. `upcoming` lists the following occurrences of a recurring task
 * (trigger time + task date), so "Done" on the lock screen can arm the next one even when the
 * app is not opened for a while.
 */
data class AlarmSpec(
  val id: String,
  val taskId: String?,
  val occurrence: String?,
  val title: String,
  val timeText: String,
  val detailText: String,
  val triggerAt: Long,
  val upcoming: List<Pair<Long, String>> = emptyList(),
  /** scheduled | ringing | queued | snoozed */
  val status: String = STATUS_SCHEDULED,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("taskId", taskId ?: JSONObject.NULL)
    .put("occurrence", occurrence ?: JSONObject.NULL)
    .put("title", title)
    .put("timeText", timeText)
    .put("detailText", detailText)
    .put("triggerAt", triggerAt)
    .put("upcoming", JSONArray(upcoming.map { JSONObject().put("at", it.first).put("date", it.second) }))
    .put("status", status)

  companion object {
    const val STATUS_SCHEDULED = "scheduled"
    const val STATUS_RINGING = "ringing"
    const val STATUS_QUEUED = "queued"
    const val STATUS_SNOOZED = "snoozed"

    fun fromJson(o: JSONObject) = AlarmSpec(
      id = o.getString("id"),
      taskId = o.optStringOrNull("taskId"),
      occurrence = o.optStringOrNull("occurrence"),
      title = o.optString("title"),
      timeText = o.optString("timeText"),
      detailText = o.optString("detailText"),
      triggerAt = o.optLong("triggerAt"),
      upcoming = o.optJSONArray("upcoming")?.let { arr ->
        List(arr.length()) { arr.getJSONObject(it).let { u -> u.getLong("at") to u.getString("date") } }
      } ?: emptyList(),
      status = o.optString("status", STATUS_SCHEDULED),
    )
  }
}

private fun JSONObject.optStringOrNull(key: String): String? =
  if (isNull(key) || !has(key)) null else optString(key)

/**
 * Small persistent state in SharedPreferences: the alarms, the queue of alerts waiting to be
 * shown, the alert on screen, and "Done" presses JS has not processed yet. All access is
 * synchronized because receivers, the activity and the JS module can run concurrently.
 */
class AlarmStore private constructor(context: Context) {
  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences("faculty_flow_alarms", Context.MODE_PRIVATE)

  @Synchronized fun all(): List<AlarmSpec> {
    val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
    return obj.keys().asSequence().mapNotNull { key ->
      runCatching { AlarmSpec.fromJson(obj.getJSONObject(key)) }.getOrNull()
    }.toList()
  }

  @Synchronized fun get(id: String): AlarmSpec? = all().firstOrNull { it.id == id }

  @Synchronized fun put(spec: AlarmSpec) {
    val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
    obj.put(spec.id, spec.toJson())
    prefs.edit().putString(KEY_ALARMS, obj.toString()).commit()
  }

  @Synchronized fun remove(id: String) {
    val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
    obj.remove(id)
    prefs.edit().putString(KEY_ALARMS, obj.toString()).commit()
    queueRemove(id)
  }

  @Synchronized fun clear() {
    prefs.edit().remove(KEY_ALARMS).remove(KEY_QUEUE).remove(KEY_CURRENT).commit()
  }

  // --- the alert on screen and the queue behind it ---------------------------------------------

  @Synchronized fun current(): String? = prefs.getString(KEY_CURRENT, null)

  @Synchronized fun setCurrent(id: String?) {
    prefs.edit().apply { if (id == null) remove(KEY_CURRENT) else putString(KEY_CURRENT, id) }.commit()
  }

  @Synchronized fun enqueue(id: String) {
    val q = queue()
    if (!q.contains(id)) q.add(id)
    saveQueue(q)
  }

  @Synchronized fun dequeue(): String? {
    val q = queue()
    val first = q.removeFirstOrNull()
    saveQueue(q)
    return first
  }

  @Synchronized private fun queueRemove(id: String) {
    val q = queue()
    if (q.remove(id)) saveQueue(q)
  }

  private fun queue(): MutableList<String> {
    val arr = JSONArray(prefs.getString(KEY_QUEUE, "[]") ?: "[]")
    return MutableList(arr.length()) { arr.getString(it) }
  }

  private fun saveQueue(q: List<String>) {
    prefs.edit().putString(KEY_QUEUE, JSONArray(q).toString()).commit()
  }

  // --- "Done" presses waiting for JS -----------------------------------------------------------

  @Synchronized fun addPendingDone(taskId: String, occurrence: String?) {
    val arr = JSONArray(prefs.getString(KEY_PENDING, "[]") ?: "[]")
    arr.put(JSONObject().put("taskId", taskId).put("occurrence", occurrence ?: JSONObject.NULL))
    prefs.edit().putString(KEY_PENDING, arr.toString()).commit()
  }

  /** Returns and clears the pending "Done" presses. */
  @Synchronized fun takePendingDone(): List<Pair<String, String?>> {
    val arr = JSONArray(prefs.getString(KEY_PENDING, "[]") ?: "[]")
    prefs.edit().remove(KEY_PENDING).commit()
    return List(arr.length()) {
      val o = arr.getJSONObject(it)
      o.getString("taskId") to o.optStringOrNull("occurrence")
    }
  }

  // --- settings --------------------------------------------------------------------------------

  var snoozeMinutes: Int
    @Synchronized get() = prefs.getInt(KEY_SNOOZE, 5)
    @Synchronized set(value) {
      prefs.edit().putInt(KEY_SNOOZE, value).commit()
    }

  companion object {
    private const val KEY_ALARMS = "alarms"
    private const val KEY_QUEUE = "queue"
    private const val KEY_CURRENT = "current"
    private const val KEY_PENDING = "pending_done"
    private const val KEY_SNOOZE = "snooze_minutes"

    @Volatile private var instance: AlarmStore? = null

    fun get(context: Context): AlarmStore =
      instance ?: synchronized(this) { instance ?: AlarmStore(context).also { instance = it } }
  }
}
