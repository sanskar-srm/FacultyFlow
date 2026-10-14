// Creates the Excel file, saves a copy to Downloads, and shares or opens it.
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import FacultyFiles from '@/modules/faculty-files';
import { APP_NAME } from '@/src/constants/appConstants';
import { getTasksInRange } from '@/src/database/taskRepository';
import type { Profile } from '@/src/types/task';
import { exportFileName, type ExportRange } from './exportRange';
import { buildTaskWorkbook, filterByStatus, type ExportSummary, type PreviewTable, type StatusFilter } from './taskSheet';
import { buildXlsx, XLSX_MIME } from './xlsx';

export interface ExportResult {
  fileName: string;
  range: ExportRange;
  status: StatusFilter;
  /** Working copy in the app cache, used for sharing and opening. */
  cacheUri: string;
  /** Where the permanent copy was saved, or null when saving failed. */
  savedPath: string | null;
  preview: PreviewTable;
  summary: ExportSummary;
}

/** The latest export, handed from the export screen to the result screen. */
let lastExport: ExportResult | null = null;

export function getLastExport(): ExportResult | null {
  return lastExport;
}

export async function countTasks(range: ExportRange, status: StatusFilter): Promise<number> {
  return filterByStatus(await getTasksInRange(range.start, range.end), status).length;
}

function exportsDir(): Directory {
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Saves a permanent copy: Downloads/Faculty Flow on the phone, or the app's documents as a fallback. */
async function savePermanentCopy(file: File, fileName: string): Promise<string> {
  if (FacultyFiles) {
    const saved = await FacultyFiles.saveToDownloads(file.uri, fileName, XLSX_MIME, APP_NAME);
    return saved.path;
  }
  // Without the native module (Expo Go), keep a copy in the app's private documents.
  const dir = new Directory(Paths.document, 'Exports');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, fileName);
  if (target.exists) target.delete();
  file.copySync(target);
  return target.uri;
}

export async function createExport(range: ExportRange, status: StatusFilter, profile: Profile | null): Promise<ExportResult> {
  const tasks = filterByStatus(await getTasksInRange(range.start, range.end), status);
  const workbook = buildTaskWorkbook(tasks, { range, status, profile });
  const bytes = buildXlsx(workbook.sheets);
  const fileName = exportFileName(range);

  const file = new File(exportsDir(), fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);

  let savedPath: string | null = null;
  try {
    savedPath = await savePermanentCopy(file, fileName);
  } catch {
    // The sheet can still be previewed, shared and opened from the cache copy.
  }

  lastExport = {
    fileName,
    range,
    status,
    cacheUri: file.uri,
    savedPath,
    preview: workbook.preview,
    summary: workbook.summary,
  };
  return lastExport;
}

/** System share sheet: WhatsApp, Gmail, Drive, Bluetooth and any other app that accepts files. */
export async function shareExport(result: ExportResult): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(result.cacheUri, { mimeType: XLSX_MIME, dialogTitle: `Share ${result.fileName}` });
}

/** Opens the sheet in Excel, Google Sheets, WPS or another installed viewer. False if none is installed. */
export async function openExport(result: ExportResult): Promise<boolean> {
  if (!FacultyFiles) return false;
  return FacultyFiles.openFile(new File(result.cacheUri).contentUri, XLSX_MIME);
}
