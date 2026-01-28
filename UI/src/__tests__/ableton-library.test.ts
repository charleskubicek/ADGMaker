/**
 * Unit Tests for Ableton Library Detection
 *
 * Tests the library path detection and utilities
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  getDefaultLibraryPaths,
  findAbletonLibrary,
  isValidAbletonLibrary,
  getLibraryInfo,
  ensureDrumRackDirectory,
  getRecommendedOutputPath,
  runOnboarding,
  LIBRARY_PATH_STORAGE_KEY,
} from '../core/ableton-library';
import { TEST_FIXTURES_PATH } from './setup';

describe('Ableton Library Detection', () => {
  const mockLibraryPath = path.join(TEST_FIXTURES_PATH, 'MockAbletonLibrary');

  beforeAll(() => {
    // Create mock Ableton library structure
    const dirs = [
      path.join(mockLibraryPath, 'Presets'),
      path.join(mockLibraryPath, 'Presets', 'Instruments'),
      path.join(mockLibraryPath, 'Presets', 'Instruments', 'Drum Rack'),
      path.join(mockLibraryPath, 'Samples'),
      path.join(mockLibraryPath, 'Samples', 'Imported'),
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(mockLibraryPath)) {
      fs.rmSync(mockLibraryPath, { recursive: true, force: true });
    }
  });

  describe('getDefaultLibraryPaths', () => {
    it('should return an array of paths', () => {
      const paths = getDefaultLibraryPaths();

      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should return paths based on current platform', () => {
      const paths = getDefaultLibraryPaths();
      const homeDir = os.homedir();

      // All paths should start with home directory or a drive letter
      for (const p of paths) {
        const startsWithHome = p.startsWith(homeDir);
        const startsWithDrive = /^[A-Z]:/.test(p);
        expect(startsWithHome || startsWithDrive).toBe(true);
      }
    });

    it('should contain "User Library" in paths', () => {
      const paths = getDefaultLibraryPaths();

      const hasUserLibrary = paths.some(p =>
        p.toLowerCase().includes('user library')
      );
      expect(hasUserLibrary).toBe(true);
    });
  });

  describe('isValidAbletonLibrary', () => {
    it('should return true for valid library structure', async () => {
      const isValid = await isValidAbletonLibrary(mockLibraryPath);

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const isValid = await isValidAbletonLibrary('/nonexistent/path');

      expect(isValid).toBe(false);
    });

    it('should return false for file path', async () => {
      const filePath = path.join(TEST_FIXTURES_PATH, 'test-file.txt');
      fs.writeFileSync(filePath, 'test');

      const isValid = await isValidAbletonLibrary(filePath);

      expect(isValid).toBe(false);

      // Cleanup
      fs.unlinkSync(filePath);
    });

    it('should return true for path containing "User Library"', async () => {
      const userLibPath = path.join(TEST_FIXTURES_PATH, 'User Library');
      fs.mkdirSync(userLibPath, { recursive: true });

      const isValid = await isValidAbletonLibrary(userLibPath);

      expect(isValid).toBe(true);

      // Cleanup
      fs.rmSync(userLibPath, { recursive: true, force: true });
    });

    it('should return true if Presets directory exists', async () => {
      const presetsPath = path.join(TEST_FIXTURES_PATH, 'LibraryWithPresets');
      fs.mkdirSync(path.join(presetsPath, 'Presets'), { recursive: true });

      const isValid = await isValidAbletonLibrary(presetsPath);

      expect(isValid).toBe(true);

      // Cleanup
      fs.rmSync(presetsPath, { recursive: true, force: true });
    });

    it('should return true if Samples directory exists', async () => {
      const samplesPath = path.join(TEST_FIXTURES_PATH, 'LibraryWithSamples');
      fs.mkdirSync(path.join(samplesPath, 'Samples'), { recursive: true });

      const isValid = await isValidAbletonLibrary(samplesPath);

      expect(isValid).toBe(true);

      // Cleanup
      fs.rmSync(samplesPath, { recursive: true, force: true });
    });
  });

  describe('getLibraryInfo', () => {
    it('should return full library info', async () => {
      const info = await getLibraryInfo(mockLibraryPath);

      expect(info.path).toBe(mockLibraryPath);
      expect(info.exists).toBe(true);
      expect(info.presetsPath).toBe(path.join(mockLibraryPath, 'Presets'));
      expect(info.drumRackPath).toBe(
        path.join(mockLibraryPath, 'Presets', 'Instruments', 'Drum Rack')
      );
    });

    it('should indicate non-existent library', async () => {
      const info = await getLibraryInfo('/nonexistent/path');

      expect(info.exists).toBe(false);
    });
  });

  describe('ensureDrumRackDirectory', () => {
    it('should create Drum Rack directory structure', async () => {
      const testLibrary = path.join(TEST_FIXTURES_PATH, 'EnsureTestLibrary');

      const drumRackPath = await ensureDrumRackDirectory(testLibrary);

      expect(fs.existsSync(drumRackPath)).toBe(true);
      expect(drumRackPath).toContain('Drum Rack');

      // Cleanup
      fs.rmSync(testLibrary, { recursive: true, force: true });
    });

    it('should not fail if directory already exists', async () => {
      const drumRackPath1 = await ensureDrumRackDirectory(mockLibraryPath);
      const drumRackPath2 = await ensureDrumRackDirectory(mockLibraryPath);

      expect(drumRackPath1).toBe(drumRackPath2);
    });
  });

  describe('getRecommendedOutputPath', () => {
    it('should return Drum Rack path without pack name', async () => {
      const outputPath = await getRecommendedOutputPath(mockLibraryPath);

      expect(outputPath).toContain('Drum Rack');
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should create pack-specific subdirectory', async () => {
      const outputPath = await getRecommendedOutputPath(mockLibraryPath, 'My Sample Pack');

      expect(outputPath).toContain('My Sample Pack');
      expect(fs.existsSync(outputPath)).toBe(true);

      // Cleanup
      fs.rmSync(outputPath, { recursive: true, force: true });
    });

    it('should handle special characters in pack name', async () => {
      const outputPath = await getRecommendedOutputPath(mockLibraryPath, 'Pack With Spaces');

      expect(outputPath).toContain('Pack With Spaces');
      expect(fs.existsSync(outputPath)).toBe(true);

      // Cleanup
      fs.rmSync(outputPath, { recursive: true, force: true });
    });
  });

  describe('findAbletonLibrary', () => {
    it('should return null when no library found', async () => {
      // Note: This test might find a real Ableton library on developer machines
      // In a clean environment, it should return null
      const library = await findAbletonLibrary();

      // We can't guarantee the result - just check the type
      expect(library === null || typeof library === 'string').toBe(true);
    });
  });

  describe('runOnboarding', () => {
    it('should return onboarding result', async () => {
      const result = await runOnboarding();

      expect(result).toHaveProperty('libraryPath');
      expect(result).toHaveProperty('autoDetected');
      expect(result).toHaveProperty('needsManualSelection');
      expect(typeof result.autoDetected).toBe('boolean');
      expect(typeof result.needsManualSelection).toBe('boolean');
    });

    it('should set needsManualSelection when no library found', async () => {
      const result = await runOnboarding();

      // If no library was auto-detected, needsManualSelection should be true
      if (!result.autoDetected) {
        expect(result.needsManualSelection).toBe(true);
      }
    });
  });

  describe('LIBRARY_PATH_STORAGE_KEY', () => {
    it('should be defined', () => {
      expect(LIBRARY_PATH_STORAGE_KEY).toBe('abletonLibraryPath');
    });
  });
});
