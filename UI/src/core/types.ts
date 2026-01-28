/**
 * Type definitions for ADGMaker
 */

export type FileType = 'wav' | 'mp3' | 'aiff' | 'flac';

export interface GenerateOptions {
  folders: string[];
  fileType: FileType;
  includeLoops: boolean;
  debug: boolean;
  outputDirectory: string;
  customNames?: Record<string, string>;
}

export interface AdgCreatedEvent {
  name: string;
  path: string;
}

export interface AdgErrorEvent {
  error: string;
  folder?: string;
}

export interface AdgProgressEvent {
  current: number;
  total: number;
  currentFolder?: string;
  currentFile?: string;
}

export interface AdgCompleteEvent {
  count: number;
  outputDirectory: string;
}

export interface SampleInfo {
  filePath: string;
  fileName: string;
  name: string;
  noteValue: number;
}

export interface AdgData {
  name: string;
  instruments: string[];
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Renderer -> Main
  SELECT_FOLDER: 'dialog:select-folder',
  SELECT_OUTPUT: 'dialog:select-output',
  GENERATE: 'adg:generate',
  CANCEL: 'adg:cancel',

  // Main -> Renderer
  CREATED: 'adg:created',
  ERROR: 'adg:error',
  PROGRESS: 'adg:progress',
  COMPLETE: 'adg:complete',
  FOLDER_SELECTED: 'dialog:folder-selected',
  OUTPUT_SELECTED: 'dialog:output-selected',
} as const;
