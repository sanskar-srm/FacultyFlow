// Saving exports to Downloads and opening them (Android only). Native code: ./android/src/main/java/expo/modules/facultyfiles
import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface SavedFile {
  uri: string;
  /** Human-readable location, e.g. "Download/Faculty Flow/FacultyFlow_Tasks_October-2026.xlsx". */
  path: string;
}

declare class FacultyFilesModule extends NativeModule {
  saveToDownloads(sourceUri: string, fileName: string, mimeType: string, folder: string): Promise<SavedFile>;
  openFile(contentUri: string, mimeType: string): Promise<boolean>;
}

/** Null in Expo Go or any build without the native module. */
export default requireOptionalNativeModule<FacultyFilesModule>('FacultyFiles');
