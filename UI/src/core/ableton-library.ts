/**
 * Ableton Library Detection
 *
 * Detects Ableton Live User Library locations on different platforms
 * and provides utilities for writing rack devices to the library.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AbletonLibraryInfo {
  path: string;
  exists: boolean;
  presetsPath: string;
  drumRackPath: string;
}

/**
 * Get the default Ableton User Library paths for the current platform
 */
export function getDefaultLibraryPaths(): string[] {
  const homeDir = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case 'darwin': // macOS
      return [
        path.join(homeDir, 'Music', 'Ableton', 'User Library'),
        // Older versions
        path.join(homeDir, 'Documents', 'Ableton', 'User Library'),
      ];

    case 'win32': // Windows
      return [
        path.join(homeDir, 'Documents', 'Ableton', 'User Library'),
        // Alternative Windows paths
        path.join('C:', 'Users', os.userInfo().username, 'Documents', 'Ableton', 'User Library'),
      ];

    case 'linux': // Linux (less common for Ableton)
      return [
        path.join(homeDir, 'Ableton', 'User Library'),
        path.join(homeDir, 'Documents', 'Ableton', 'User Library'),
        path.join(homeDir, '.wine', 'drive_c', 'Users', os.userInfo().username, 'Documents', 'Ableton', 'User Library'),
      ];

    default:
      return [
        path.join(homeDir, 'Documents', 'Ableton', 'User Library'),
      ];
  }
}

/**
 * Find the first existing Ableton User Library
 */
export async function findAbletonLibrary(): Promise<string | null> {
  const defaultPaths = getDefaultLibraryPaths();

  for (const libraryPath of defaultPaths) {
    try {
      const stats = await fs.promises.stat(libraryPath);
      if (stats.isDirectory()) {
        return libraryPath;
      }
    } catch {
      // Path doesn't exist, continue to next
    }
  }

  return null;
}

/**
 * Check if a path is a valid Ableton User Library
 */
export async function isValidAbletonLibrary(libraryPath: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(libraryPath);
    if (!stats.isDirectory()) {
      return false;
    }

    // Check for typical Ableton User Library structure
    const expectedSubdirs = ['Presets', 'Samples'];
    let foundCount = 0;

    for (const subdir of expectedSubdirs) {
      const subdirPath = path.join(libraryPath, subdir);
      try {
        const subdirStats = await fs.promises.stat(subdirPath);
        if (subdirStats.isDirectory()) {
          foundCount++;
        }
      } catch {
        // Subdir doesn't exist
      }
    }

    // Consider valid if at least one expected subdir exists
    // or if the folder name contains "User Library"
    return foundCount > 0 || libraryPath.toLowerCase().includes('user library');
  } catch {
    return false;
  }
}

/**
 * Get full library info including preset paths
 */
export async function getLibraryInfo(libraryPath: string): Promise<AbletonLibraryInfo> {
  const presetsPath = path.join(libraryPath, 'Presets');
  const drumRackPath = path.join(presetsPath, 'Instruments', 'Drum Rack');

  const exists = await isValidAbletonLibrary(libraryPath);

  return {
    path: libraryPath,
    exists,
    presetsPath,
    drumRackPath,
  };
}

/**
 * Ensure the Drum Rack presets directory exists
 */
export async function ensureDrumRackDirectory(libraryPath: string): Promise<string> {
  const drumRackPath = path.join(libraryPath, 'Presets', 'Instruments', 'Drum Rack');

  await fs.promises.mkdir(drumRackPath, { recursive: true });

  return drumRackPath;
}

/**
 * Get the recommended output directory for ADG files
 */
export async function getRecommendedOutputPath(libraryPath: string, packName?: string): Promise<string> {
  const drumRackPath = await ensureDrumRackDirectory(libraryPath);

  if (packName) {
    const packPath = path.join(drumRackPath, packName);
    await fs.promises.mkdir(packPath, { recursive: true });
    return packPath;
  }

  return drumRackPath;
}

/**
 * Storage key for persisted library path
 */
export const LIBRARY_PATH_STORAGE_KEY = 'abletonLibraryPath';

/**
 * Onboarding result
 */
export interface OnboardingResult {
  libraryPath: string | null;
  autoDetected: boolean;
  needsManualSelection: boolean;
}

/**
 * Run onboarding to find or prompt for Ableton library
 */
export async function runOnboarding(): Promise<OnboardingResult> {
  // Try to auto-detect
  const detectedPath = await findAbletonLibrary();

  if (detectedPath) {
    return {
      libraryPath: detectedPath,
      autoDetected: true,
      needsManualSelection: false,
    };
  }

  return {
    libraryPath: null,
    autoDetected: false,
    needsManualSelection: true,
  };
}
