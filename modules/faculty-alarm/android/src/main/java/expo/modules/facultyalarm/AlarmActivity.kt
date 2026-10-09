package expo.modules.facultyalarm

import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.lang.ref.WeakReference

/**
 * The full-screen alert shown over the lock screen: task title, time, details and three large
 * buttons. Plain Android views, so it opens instantly without starting React Native.
 */
class AlarmActivity : Activity() {
  private var alarmId: String? = null
  private var spec: AlarmSpec? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    bind(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    bind(intent)
  }

  override fun onDestroy() {
    if (current?.get() === this) current = null
    super.onDestroy()
  }

  private fun bind(intent: Intent) {
    val id = intent.getStringExtra(Alarms.EXTRA_ID)
    val found = id?.let { AlarmStore.get(this).get(it) }
    if (id == null || found == null) {
      finish()
      return
    }
    alarmId = id
    spec = found
    current = WeakReference(this)
    setContentView(buildView(found))
  }

  private fun act(action: String) {
    val id = alarmId ?: return finish()
    Alarms.handleAction(applicationContext, action, id, spec)
    finish()
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  // --- view ------------------------------------------------------------------------------------

  private fun buildView(spec: AlarmSpec): View {
    val dark = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    val bg = if (dark) Color.parseColor("#0E1113") else Color.parseColor("#F6F7F9")
    val text = if (dark) Color.parseColor("#F1F3F5") else Color.parseColor("#111827")
    val muted = if (dark) Color.parseColor("#A2ABB4") else Color.parseColor("#5F6B78")
    val surface = if (dark) Color.parseColor("#22282D") else Color.parseColor("#E9EDF0")
    val accent = if (dark) Color.parseColor("#2DD4BF") else Color.parseColor("#0F766E")
    val onAccent = if (dark) Color.parseColor("#03201C") else Color.WHITE

    // Status/navigation bar icons readable on our background (the window is edge-to-edge).
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !dark
      isAppearanceLightNavigationBars = !dark
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(bg)
    }
    // Keep content clear of the status and navigation bars, plus our own margins.
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      v.setPadding(bars.left + dp(24), bars.top + dp(48), bars.right + dp(24), bars.bottom + dp(24))
      insets
    }

    val top = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
    }
    top.addView(label("TASK REMINDER", 13f, accent, bold = true).apply { letterSpacing = 0.12f })
    top.addView(label(spec.timeText, 52f, text, bold = true).apply { setPadding(0, dp(20), 0, 0) })
    top.addView(label(spec.title, 26f, text, bold = true).apply { setPadding(0, dp(16), 0, 0) })
    if (spec.detailText.isNotBlank()) {
      top.addView(label(spec.detailText, 16f, muted).apply { setPadding(0, dp(10), 0, 0) })
    }
    root.addView(top, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

    val snooze = AlarmStore.get(this).snoozeMinutes
    root.addView(button("Done", accent, onAccent) { act(Alarms.ACTION_DONE) }, buttonParams(dp(68)))
    val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    row.addView(button("Snooze $snooze min", surface, text) { act(Alarms.ACTION_SNOOZE) },
      LinearLayout.LayoutParams(0, dp(60), 1f).apply { marginEnd = dp(6) })
    row.addView(button("Dismiss", surface, text) { act(Alarms.ACTION_DISMISS) },
      LinearLayout.LayoutParams(0, dp(60), 1f).apply { marginStart = dp(6) })
    root.addView(row, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(60)).apply { topMargin = dp(12) })
    return root
  }

  private fun label(value: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
    text = value
    setTextColor(color)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    gravity = Gravity.CENTER
    if (bold) typeface = Typeface.DEFAULT_BOLD
  }

  private fun button(value: String, bg: Int, fg: Int, onClick: () -> Unit) = Button(this).apply {
    text = value
    isAllCaps = false
    setTextColor(fg)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
    typeface = Typeface.DEFAULT_BOLD
    stateListAnimator = null
    background = GradientDrawable().apply {
      cornerRadius = dp(16).toFloat()
      setColor(bg)
    }
    setOnClickListener { onClick() }
  }

  private fun buttonParams(height: Int) =
    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height)

  private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

  companion object {
    @Volatile private var current: WeakReference<AlarmActivity>? = null

    /** Closes the alert screen if it is showing this alarm (completed in the app, cancelled, ...). */
    fun close(id: String) {
      val activity = current?.get() ?: return
      if (activity.alarmId == id) activity.runOnUiThread { activity.finish() }
    }
  }
}
