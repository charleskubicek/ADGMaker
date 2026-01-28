/**
 * Unit Tests for Types module
 *
 * Tests the type definitions and constants
 */

import { IPC_CHANNELS, FileType, GenerateOptions } from '../core/types';

describe('Types', () => {
  describe('IPC_CHANNELS', () => {
    it('should have all renderer -> main channels', () => {
      expect(IPC_CHANNELS.SELECT_FOLDER).toBe('dialog:select-folder');
      expect(IPC_CHANNELS.SELECT_OUTPUT).toBe('dialog:select-output');
      expect(IPC_CHANNELS.SELECT_LIBRARY).toBe('dialog:select-library');
      expect(IPC_CHANNELS.GENERATE).toBe('adg:generate');
      expect(IPC_CHANNELS.CANCEL).toBe('adg:cancel');
      expect(IPC_CHANNELS.DETECT_LIBRARY).toBe('library:detect');
      expect(IPC_CHANNELS.SAVE_SETTINGS).toBe('settings:save');
      expect(IPC_CHANNELS.LOAD_SETTINGS).toBe('settings:load');
    });

    it('should have all main -> renderer channels', () => {
      expect(IPC_CHANNELS.CREATED).toBe('adg:created');
      expect(IPC_CHANNELS.ERROR).toBe('adg:error');
      expect(IPC_CHANNELS.PROGRESS).toBe('adg:progress');
      expect(IPC_CHANNELS.COMPLETE).toBe('adg:complete');
      expect(IPC_CHANNELS.FOLDER_SELECTED).toBe('dialog:folder-selected');
      expect(IPC_CHANNELS.OUTPUT_SELECTED).toBe('dialog:output-selected');
      expect(IPC_CHANNELS.LIBRARY_DETECTED).toBe('library:detected');
      expect(IPC_CHANNELS.SETTINGS_LOADED).toBe('settings:loaded');
    });

    it('should be a readonly object', () => {
      // TypeScript ensures this at compile time, but we can verify at runtime
      // that all expected channels exist
      const expectedChannels = [
        'SELECT_FOLDER',
        'SELECT_OUTPUT',
        'SELECT_LIBRARY',
        'GENERATE',
        'CANCEL',
        'DETECT_LIBRARY',
        'SAVE_SETTINGS',
        'LOAD_SETTINGS',
        'CREATED',
        'ERROR',
        'PROGRESS',
        'COMPLETE',
        'FOLDER_SELECTED',
        'OUTPUT_SELECTED',
        'LIBRARY_DETECTED',
        'SETTINGS_LOADED',
      ];

      for (const channel of expectedChannels) {
        expect(IPC_CHANNELS).toHaveProperty(channel);
      }
    });
  });

  describe('FileType', () => {
    it('should accept valid file types', () => {
      const validTypes: FileType[] = ['wav', 'mp3', 'aiff', 'flac'];

      for (const type of validTypes) {
        expect(['wav', 'mp3', 'aiff', 'flac']).toContain(type);
      }
    });
  });

  describe('GenerateOptions', () => {
    it('should create valid options object', () => {
      const options: GenerateOptions = {
        folders: ['/path/to/samples'],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: '/path/to/output',
      };

      expect(options.folders).toHaveLength(1);
      expect(options.fileType).toBe('wav');
      expect(options.includeLoops).toBe(false);
      expect(options.debug).toBe(false);
      expect(options.outputDirectory).toBe('/path/to/output');
    });

    it('should support optional customNames', () => {
      const options: GenerateOptions = {
        folders: ['/path/to/samples'],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: '/path/to/output',
        customNames: {
          '/path/to/samples': 'CustomName',
        },
      };

      expect(options.customNames?.['/path/to/samples']).toBe('CustomName');
    });
  });
});
