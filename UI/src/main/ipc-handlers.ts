/**
 * IPC Handlers
 *
 * Handles communication between main and renderer processes
 */

import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SamplePackProcessor } from '../core/sample-pack-processor';
import { GenerateOptions, IPC_CHANNELS, AppSettings } from '../core/types';
import {
  findAbletonLibrary,
  isValidAbletonLibrary,
  getRecommendedOutputPath,
} from '../core/ableton-library';

let processor: SamplePackProcessor | null = null;
let mainWindowRef: BrowserWindow | null = null;

// Settings file path
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

// Load settings from file
async function loadSettings(): Promise<AppSettings> {
  const settingsPath = getSettingsPath();
  try {
    const data = await fs.promises.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      abletonLibraryPath: null,
      onboardingComplete: false,
    };
  }
}

// Save settings to file
async function saveSettings(settings: AppSettings): Promise<void> {
  const settingsPath = getSettingsPath();
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export function setupIpcHandlers(mainWindow: BrowserWindow | null): void {
  mainWindowRef = mainWindow;

  // Handle folder selection dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    if (!mainWindowRef) return null;

    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openDirectory'],
      title: 'Select Sample Pack Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Handle output directory selection dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_OUTPUT, async () => {
    if (!mainWindowRef) return null;

    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Handle Ableton library selection dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_LIBRARY, async () => {
    if (!mainWindowRef) return null;

    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openDirectory'],
      title: 'Select Ableton User Library Folder',
      message: 'Select your Ableton Live User Library folder (usually in Music/Ableton/User Library)',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];

    // Validate the selected path
    const isValid = await isValidAbletonLibrary(selectedPath);

    return {
      path: selectedPath,
      isValid,
    };
  });

  // Handle Ableton library auto-detection
  ipcMain.handle(IPC_CHANNELS.DETECT_LIBRARY, async () => {
    const detectedPath = await findAbletonLibrary();

    if (detectedPath) {
      return {
        path: detectedPath,
        autoDetected: true,
        needsManualSelection: false,
      };
    }

    return {
      path: null,
      autoDetected: false,
      needsManualSelection: true,
    };
  });

  // Handle settings loading
  ipcMain.handle(IPC_CHANNELS.LOAD_SETTINGS, async () => {
    return await loadSettings();
  });

  // Handle settings saving
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (event, settings: AppSettings) => {
    await saveSettings(settings);
    return true;
  });

  // Handle ADG generation
  ipcMain.on(IPC_CHANNELS.GENERATE, async (event, options: GenerateOptions) => {
    if (!mainWindowRef) return;

    // Get the templates path - in production it's in resources, in dev it's in src
    // After compilation: __dirname is dist/main/main, templates are in src/templates
    let templatesPath: string;
    if (app.isPackaged) {
      templatesPath = path.join(process.resourcesPath, 'src', 'templates');
    } else {
      templatesPath = path.join(__dirname, '..', '..', '..', 'src', 'templates');
    }

    // Create processor
    processor = new SamplePackProcessor(templatesPath, options.fileType, options.debug);

    // Progress callback
    const onProgress = (progressEvent: any) => {
      mainWindowRef?.webContents.send(IPC_CHANNELS.PROGRESS, progressEvent);
    };

    // Created callback
    const onCreated = (createdEvent: any) => {
      mainWindowRef?.webContents.send(IPC_CHANNELS.CREATED, createdEvent);
    };

    // Error callback
    const onError = (error: string) => {
      mainWindowRef?.webContents.send(IPC_CHANNELS.ERROR, { error });
    };

    try {
      const totalCreated = await processor.processMultipleFolders(
        options,
        onProgress,
        onCreated,
        onError
      );

      mainWindowRef?.webContents.send(IPC_CHANNELS.COMPLETE, {
        count: totalCreated,
        outputDirectory: options.outputDirectory,
      });
    } catch (err) {
      mainWindowRef?.webContents.send(IPC_CHANNELS.ERROR, {
        error: `Generation failed: ${err}`,
      });
    } finally {
      processor = null;
    }
  });

  // Handle cancellation
  ipcMain.on(IPC_CHANNELS.CANCEL, () => {
    if (processor) {
      processor.cancel();
    }
  });
}
