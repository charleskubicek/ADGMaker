/**
 * Preload Script
 *
 * Exposes safe APIs to the renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  GenerateOptions,
  AdgCreatedEvent,
  AdgErrorEvent,
  AdgProgressEvent,
  AdgCompleteEvent,
  AbletonLibraryResult,
  AppSettings,
  IPC_CHANNELS,
} from '../core/types';

// Library selection result
interface LibrarySelectionResult {
  path: string;
  isValid: boolean;
}

// Define the API exposed to the renderer
export interface ElectronAPI {
  // Dialogs
  selectFolder: () => Promise<string | null>;
  selectOutputDirectory: () => Promise<string | null>;
  selectLibraryPath: () => Promise<LibrarySelectionResult | null>;

  // ADG Generation
  generate: (options: GenerateOptions) => void;
  cancelGeneration: () => void;

  // Ableton Library
  detectLibrary: () => Promise<AbletonLibraryResult>;

  // Settings
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;

  // Event listeners
  onAdgCreated: (callback: (event: AdgCreatedEvent) => void) => () => void;
  onAdgError: (callback: (event: AdgErrorEvent) => void) => () => void;
  onAdgProgress: (callback: (event: AdgProgressEvent) => void) => () => void;
  onAdgComplete: (callback: (event: AdgCompleteEvent) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  // Dialogs
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),
  selectOutputDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT),
  selectLibraryPath: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_LIBRARY),

  // ADG Generation
  generate: (options: GenerateOptions) => {
    ipcRenderer.send(IPC_CHANNELS.GENERATE, options);
  },
  cancelGeneration: () => {
    ipcRenderer.send(IPC_CHANNELS.CANCEL);
  },

  // Ableton Library
  detectLibrary: () => ipcRenderer.invoke(IPC_CHANNELS.DETECT_LIBRARY),

  // Settings
  loadSettings: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_SETTINGS),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  // Event listeners with cleanup
  onAdgCreated: (callback: (event: AdgCreatedEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: AdgCreatedEvent) => callback(event);
    ipcRenderer.on(IPC_CHANNELS.CREATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CREATED, handler);
  },
  onAdgError: (callback: (event: AdgErrorEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: AdgErrorEvent) => callback(event);
    ipcRenderer.on(IPC_CHANNELS.ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ERROR, handler);
  },
  onAdgProgress: (callback: (event: AdgProgressEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: AdgProgressEvent) => callback(event);
    ipcRenderer.on(IPC_CHANNELS.PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROGRESS, handler);
  },
  onAdgComplete: (callback: (event: AdgCompleteEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: AdgCompleteEvent) => callback(event);
    ipcRenderer.on(IPC_CHANNELS.COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.COMPLETE, handler);
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
