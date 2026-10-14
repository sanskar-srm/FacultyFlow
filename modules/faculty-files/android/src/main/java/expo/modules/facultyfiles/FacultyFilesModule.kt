package expo.modules.facultyfiles

import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Saves exported files where the user can find them, and opens them in another app.
 *
 * Android 10+: MediaStore puts the file in the public Downloads folder with no storage permission.
 * Android 7–9: Downloads would need WRITE_EXTERNAL_STORAGE (blocked in app.json), so the file goes to
 * the app's own folder on shared storage (Android/data/<package>/files/Documents), still visible
 * in a file manager.
 */
class FacultyFilesModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FacultyFiles")

    // Copies a local file (file:// uri) into Downloads/<folder>. Returns where it ended up; the
    // name can differ ("name (1).xlsx") when a file with the same name already exists.
    AsyncFunction("saveToDownloads") { sourceUri: String, fileName: String, mimeType: String, folder: String ->
      val source = File(Uri.parse(sourceUri).path ?: throw IllegalArgumentException("Bad source uri"))
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        saveWithMediaStore(source, fileName, mimeType, folder)
      } else {
        saveToAppDocuments(source, fileName, folder)
      }
    }

    // Opens a content:// uri in an app that can view it. False when no installed app can.
    AsyncFunction("openFile") { uri: String, mimeType: String ->
      val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(Uri.parse(uri), mimeType)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      val activity = appContext.currentActivity
      try {
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        true
      } catch (e: ActivityNotFoundException) {
        false
      }
    }
  }

  private fun saveWithMediaStore(source: File, fileName: String, mimeType: String, folder: String): Map<String, String> {
    val resolver = context.contentResolver
    val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/$folder"
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
      put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }
    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
      ?: throw IllegalStateException("Couldn't create the file in Downloads")
    try {
      resolver.openOutputStream(uri)?.use { out -> source.inputStream().use { it.copyTo(out) } }
        ?: throw IllegalStateException("Couldn't write the file in Downloads")
      resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
    } catch (e: Exception) {
      resolver.delete(uri, null, null)
      throw e
    }
    val savedName = resolver.query(uri, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use {
      if (it.moveToFirst()) it.getString(0) else null
    } ?: fileName
    return mapOf("uri" to uri.toString(), "path" to "Download/$folder/$savedName")
  }

  private fun saveToAppDocuments(source: File, fileName: String, folder: String): Map<String, String> {
    val root = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
      ?: throw IllegalStateException("Shared storage is not available")
    val dir = File(root, folder).apply { mkdirs() }
    val base = fileName.substringBeforeLast('.')
    val ext = fileName.substringAfterLast('.', "")
    var target = File(dir, fileName)
    var n = 1
    while (target.exists()) {
      target = File(dir, if (ext.isEmpty()) "$base ($n)" else "$base ($n).$ext")
      n++
    }
    source.copyTo(target)
    return mapOf(
      "uri" to Uri.fromFile(target).toString(),
      "path" to "Android/data/${context.packageName}/files/${Environment.DIRECTORY_DOCUMENTS}/$folder/${target.name}",
    )
  }
}
