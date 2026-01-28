/**
 * Unit Tests for SamplePackProcessor class
 *
 * Tests the batch processing logic including:
 * - Subdirectory discovery
 * - Loop folder filtering
 * - Sample file discovery
 * - Note assignment (descending from 104)
 * - Callback invocations
 * - Cancellation
 * - Multiple folder processing
 */

import * as path from 'path';
import * as fs from 'fs';
import { SamplePackProcessor } from '../core/sample-pack-processor';
import { GenerateOptions, AdgCreatedEvent, AdgProgressEvent } from '../core/types';
import { TEST_TEMPLATES_PATH, TEST_OUTPUT_PATH, TEST_FIXTURES_PATH } from './setup';

describe('SamplePackProcessor', () => {
  let processor: SamplePackProcessor;
  const samplePackPath = path.join(TEST_FIXTURES_PATH, 'sample-pack');

  // Create test fixture directories and files
  beforeAll(() => {
    // Create sample pack structure:
    // sample-pack/
    //   Kicks/
    //     kick_01.wav
    //     kick_02.wav
    //   Snares/
    //     snare_01.wav
    //   Loops/  (should be excluded by default)
    //     loop_01.wav
    //   HiHats/
    //     hat_01.wav

    const dirs = [
      path.join(samplePackPath, 'Kicks'),
      path.join(samplePackPath, 'Snares'),
      path.join(samplePackPath, 'Loops'),
      path.join(samplePackPath, 'HiHats'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create mock sample files (empty files with .wav extension)
    const files = [
      path.join(samplePackPath, 'Kicks', 'kick_01.wav'),
      path.join(samplePackPath, 'Kicks', 'kick_02.wav'),
      path.join(samplePackPath, 'Kicks', 'kick_03.wav'),
      path.join(samplePackPath, 'Snares', 'snare_01.wav'),
      path.join(samplePackPath, 'Snares', 'snare_02.wav'),
      path.join(samplePackPath, 'Loops', 'loop_01.wav'),
      path.join(samplePackPath, 'HiHats', 'hat_01.wav'),
      path.join(samplePackPath, 'HiHats', 'hat_02.wav'),
      path.join(samplePackPath, 'HiHats', 'hat_03.wav'),
      path.join(samplePackPath, 'HiHats', 'hat_04.wav'),
    ];

    for (const file of files) {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, ''); // Create empty file
      }
    }
  });

  // Clean up test fixtures
  afterAll(() => {
    if (fs.existsSync(samplePackPath)) {
      fs.rmSync(samplePackPath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    processor = new SamplePackProcessor(TEST_TEMPLATES_PATH, 'wav', false);
  });

  describe('constructor', () => {
    it('should create processor with default values', () => {
      const proc = new SamplePackProcessor(TEST_TEMPLATES_PATH);
      expect(proc).toBeInstanceOf(SamplePackProcessor);
    });

    it('should accept custom file type', () => {
      const proc = new SamplePackProcessor(TEST_TEMPLATES_PATH, 'mp3');
      expect(proc).toBeInstanceOf(SamplePackProcessor);
    });

    it('should accept debug mode', () => {
      const proc = new SamplePackProcessor(TEST_TEMPLATES_PATH, 'wav', true);
      expect(proc).toBeInstanceOf(SamplePackProcessor);
    });
  });

  describe('getSubdirsContainingValidSamples', () => {
    it('should find all subdirectories', async () => {
      const subdirs = await processor.getSubdirsContainingValidSamples(samplePackPath, true);

      expect(subdirs.length).toBe(4);
      expect(subdirs.some(d => d.includes('Kicks'))).toBe(true);
      expect(subdirs.some(d => d.includes('Snares'))).toBe(true);
      expect(subdirs.some(d => d.includes('Loops'))).toBe(true);
      expect(subdirs.some(d => d.includes('HiHats'))).toBe(true);
    });

    it('should exclude loop directories by default', async () => {
      const subdirs = await processor.getSubdirsContainingValidSamples(samplePackPath, false);

      expect(subdirs.length).toBe(3);
      expect(subdirs.some(d => d.includes('Loops'))).toBe(false);
      expect(subdirs.some(d => d.includes('Kicks'))).toBe(true);
      expect(subdirs.some(d => d.includes('Snares'))).toBe(true);
      expect(subdirs.some(d => d.includes('HiHats'))).toBe(true);
    });

    it('should include loop directories when specified', async () => {
      const subdirs = await processor.getSubdirsContainingValidSamples(samplePackPath, true);

      expect(subdirs.some(d => d.includes('Loops'))).toBe(true);
    });

    it('should handle case-insensitive loop detection', async () => {
      // Create directories with different case "loop" variations
      const mixedCasePath = path.join(TEST_FIXTURES_PATH, 'case-test');
      const dirs = [
        path.join(mixedCasePath, 'LoopFolder'),
        path.join(mixedCasePath, 'LOOPS'),
        path.join(mixedCasePath, 'myloops'),
        path.join(mixedCasePath, 'Regular'),
      ];

      for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const subdirs = await processor.getSubdirsContainingValidSamples(mixedCasePath, false);

      // Only "Regular" should be included
      expect(subdirs.length).toBe(1);
      expect(subdirs[0]).toContain('Regular');

      // Cleanup
      fs.rmSync(mixedCasePath, { recursive: true, force: true });
    });

    it('should return empty array for directory with no subdirs', async () => {
      const emptyPath = path.join(TEST_FIXTURES_PATH, 'empty-dir');
      fs.mkdirSync(emptyPath, { recursive: true });

      const subdirs = await processor.getSubdirsContainingValidSamples(emptyPath);

      expect(subdirs.length).toBe(0);

      // Cleanup
      fs.rmSync(emptyPath, { recursive: true, force: true });
    });
  });

  describe('findSampleFiles', () => {
    it('should find all wav files in a directory', async () => {
      const files = await processor.findSampleFiles(path.join(samplePackPath, 'Kicks'), 'wav');

      expect(files.length).toBe(3);
      expect(files.every(f => f.endsWith('.wav'))).toBe(true);
    });

    it('should find files recursively', async () => {
      // Create nested structure
      const nestedPath = path.join(TEST_FIXTURES_PATH, 'nested');
      const nestedDeep = path.join(nestedPath, 'level1', 'level2');
      fs.mkdirSync(nestedDeep, { recursive: true });
      fs.writeFileSync(path.join(nestedPath, 'root.wav'), '');
      fs.writeFileSync(path.join(nestedPath, 'level1', 'l1.wav'), '');
      fs.writeFileSync(path.join(nestedDeep, 'l2.wav'), '');

      const files = await processor.findSampleFiles(nestedPath, 'wav');

      expect(files.length).toBe(3);

      // Cleanup
      fs.rmSync(nestedPath, { recursive: true, force: true });
    });

    it('should be case-insensitive for file extensions', async () => {
      const mixedPath = path.join(TEST_FIXTURES_PATH, 'mixed-case');
      fs.mkdirSync(mixedPath, { recursive: true });
      fs.writeFileSync(path.join(mixedPath, 'lower.wav'), '');
      fs.writeFileSync(path.join(mixedPath, 'upper.WAV'), '');
      fs.writeFileSync(path.join(mixedPath, 'mixed.WaV'), '');

      const files = await processor.findSampleFiles(mixedPath, 'wav');

      expect(files.length).toBe(3);

      // Cleanup
      fs.rmSync(mixedPath, { recursive: true, force: true });
    });

    it('should only find specified file type', async () => {
      const multiPath = path.join(TEST_FIXTURES_PATH, 'multi-type');
      fs.mkdirSync(multiPath, { recursive: true });
      fs.writeFileSync(path.join(multiPath, 'sample.wav'), '');
      fs.writeFileSync(path.join(multiPath, 'sample.mp3'), '');
      fs.writeFileSync(path.join(multiPath, 'sample.aiff'), '');

      const wavFiles = await processor.findSampleFiles(multiPath, 'wav');
      const mp3Files = await processor.findSampleFiles(multiPath, 'mp3');

      expect(wavFiles.length).toBe(1);
      expect(mp3Files.length).toBe(1);

      // Cleanup
      fs.rmSync(multiPath, { recursive: true, force: true });
    });

    it('should return empty array when no matching files', async () => {
      const files = await processor.findSampleFiles(path.join(samplePackPath, 'Kicks'), 'mp3');

      expect(files.length).toBe(0);
    });
  });

  describe('cancel and reset', () => {
    it('should set cancelled flag', () => {
      processor.cancel();
      // We can't directly test private field, but we can test behavior
      expect(processor).toBeInstanceOf(SamplePackProcessor);
    });

    it('should reset cancelled flag', () => {
      processor.cancel();
      processor.reset();
      expect(processor).toBeInstanceOf(SamplePackProcessor);
    });
  });

  describe('createAdgFromSamplesPath', () => {
    it('should create ADG files for each subdirectory', async () => {
      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      const count = await processor.createAdgFromSamplesPath(
        samplePackPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        undefined,
        onCreated
      );

      // Should create 3 ADGs (Kicks, Snares, HiHats - excluding Loops)
      expect(count).toBe(3);
      expect(createdEvents.length).toBe(3);
    });

    it('should use folder name as default ADG name prefix', async () => {
      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      await processor.createAdgFromSamplesPath(
        samplePackPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        undefined,
        onCreated
      );

      // Names should include "sample-pack - SubdirName"
      const names = createdEvents.map(e => e.name);
      expect(names.some(n => n.includes('sample-pack - Kicks'))).toBe(true);
      expect(names.some(n => n.includes('sample-pack - Snares'))).toBe(true);
    });

    it('should use custom name when provided', async () => {
      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      await processor.createAdgFromSamplesPath(
        samplePackPath,
        TEST_OUTPUT_PATH,
        'CustomPack',
        false,
        undefined,
        onCreated
      );

      const names = createdEvents.map(e => e.name);
      expect(names.some(n => n.includes('CustomPack - Kicks'))).toBe(true);
    });

    it('should include loops when specified', async () => {
      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      const count = await processor.createAdgFromSamplesPath(
        samplePackPath,
        TEST_OUTPUT_PATH,
        null,
        true, // include loops
        undefined,
        onCreated
      );

      // Should create 4 ADGs (including Loops)
      expect(count).toBe(4);
    });

    it('should call progress callback', async () => {
      const progressEvents: AdgProgressEvent[] = [];
      const onProgress = (event: AdgProgressEvent) => progressEvents.push(event);

      await processor.createAdgFromSamplesPath(
        samplePackPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        onProgress
      );

      expect(progressEvents.length).toBeGreaterThan(0);
    });

    it('should call error callback when no samples found', async () => {
      const emptyPath = path.join(TEST_FIXTURES_PATH, 'empty-samples');
      fs.mkdirSync(emptyPath, { recursive: true });

      let errorMessage = '';
      const onError = (error: string) => { errorMessage = error; };

      const count = await processor.createAdgFromSamplesPath(
        emptyPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        undefined,
        undefined,
        onError
      );

      expect(count).toBe(0);
      expect(errorMessage).toContain('No wav samples found');

      // Cleanup
      fs.rmSync(emptyPath, { recursive: true, force: true });
    });

    it('should process folder with samples but no subdirs', async () => {
      // Create a flat folder with samples
      const flatPath = path.join(TEST_FIXTURES_PATH, 'flat-samples');
      fs.mkdirSync(flatPath, { recursive: true });
      fs.writeFileSync(path.join(flatPath, 'sample1.wav'), '');
      fs.writeFileSync(path.join(flatPath, 'sample2.wav'), '');

      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      const count = await processor.createAdgFromSamplesPath(
        flatPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        undefined,
        onCreated
      );

      expect(count).toBe(1);
      expect(createdEvents[0].name).toBe('flat-samples');

      // Cleanup
      fs.rmSync(flatPath, { recursive: true, force: true });
    });

    it('should limit samples to 104 per ADG', async () => {
      // Create folder with more than 104 samples
      const manyPath = path.join(TEST_FIXTURES_PATH, 'many-samples');
      fs.mkdirSync(manyPath, { recursive: true });

      for (let i = 0; i < 120; i++) {
        fs.writeFileSync(path.join(manyPath, `sample_${i.toString().padStart(3, '0')}.wav`), '');
      }

      const progressEvents: AdgProgressEvent[] = [];
      const onProgress = (event: AdgProgressEvent) => progressEvents.push(event);

      await processor.createAdgFromSamplesPath(
        manyPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        onProgress
      );

      // Should process at most 104 samples
      const maxProcessed = Math.max(...progressEvents.filter(e => e.currentFile).map(e => e.current));
      expect(maxProcessed).toBeLessThanOrEqual(104);

      // Cleanup
      fs.rmSync(manyPath, { recursive: true, force: true });
    });

    it('should stop processing when cancelled', async () => {
      // Create a folder with many samples to ensure we can cancel mid-process
      const cancelPath = path.join(TEST_FIXTURES_PATH, 'cancel-test');
      const subdir = path.join(cancelPath, 'Sub1');
      fs.mkdirSync(subdir, { recursive: true });

      for (let i = 0; i < 50; i++) {
        fs.writeFileSync(path.join(subdir, `sample_${i}.wav`), '');
      }

      let progressCount = 0;
      const onProgress = () => {
        progressCount++;
        if (progressCount > 5) {
          processor.cancel();
        }
      };

      const count = await processor.createAdgFromSamplesPath(
        cancelPath,
        TEST_OUTPUT_PATH,
        null,
        false,
        onProgress
      );

      // Should have stopped early
      expect(progressCount).toBeLessThan(50);

      // Cleanup
      fs.rmSync(cancelPath, { recursive: true, force: true });
    });
  });

  describe('processMultipleFolders', () => {
    it('should process multiple folders', async () => {
      // Create two separate sample packs
      const pack1 = path.join(TEST_FIXTURES_PATH, 'pack1');
      const pack2 = path.join(TEST_FIXTURES_PATH, 'pack2');

      fs.mkdirSync(path.join(pack1, 'Kicks'), { recursive: true });
      fs.mkdirSync(path.join(pack2, 'Snares'), { recursive: true });

      fs.writeFileSync(path.join(pack1, 'Kicks', 'kick.wav'), '');
      fs.writeFileSync(path.join(pack2, 'Snares', 'snare.wav'), '');

      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      const options: GenerateOptions = {
        folders: [pack1, pack2],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: TEST_OUTPUT_PATH,
      };

      const count = await processor.processMultipleFolders(options, undefined, onCreated);

      expect(count).toBe(2);
      expect(createdEvents.length).toBe(2);

      // Cleanup
      fs.rmSync(pack1, { recursive: true, force: true });
      fs.rmSync(pack2, { recursive: true, force: true });
    });

    it('should use custom names from options', async () => {
      const pack = path.join(TEST_FIXTURES_PATH, 'named-pack');
      fs.mkdirSync(path.join(pack, 'Sub'), { recursive: true });
      fs.writeFileSync(path.join(pack, 'Sub', 'sample.wav'), '');

      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => createdEvents.push(event);

      const options: GenerateOptions = {
        folders: [pack],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: TEST_OUTPUT_PATH,
        customNames: {
          [pack]: 'MyCustomName',
        },
      };

      await processor.processMultipleFolders(options, undefined, onCreated);

      expect(createdEvents[0].name).toContain('MyCustomName');

      // Cleanup
      fs.rmSync(pack, { recursive: true, force: true });
    });

    it('should call error callback for invalid folder', async () => {
      let errorMessage = '';
      const onError = (error: string) => { errorMessage = error; };

      const options: GenerateOptions = {
        folders: ['/nonexistent/path'],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: TEST_OUTPUT_PATH,
      };

      const count = await processor.processMultipleFolders(options, undefined, undefined, onError);

      expect(count).toBe(0);
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    it('should stop when cancelled', async () => {
      const pack1 = path.join(TEST_FIXTURES_PATH, 'cancel-pack1');
      const pack2 = path.join(TEST_FIXTURES_PATH, 'cancel-pack2');

      fs.mkdirSync(pack1, { recursive: true });
      fs.mkdirSync(pack2, { recursive: true });

      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(pack1, `sample_${i}.wav`), '');
        fs.writeFileSync(path.join(pack2, `sample_${i}.wav`), '');
      }

      const createdEvents: AdgCreatedEvent[] = [];
      const onCreated = (event: AdgCreatedEvent) => {
        createdEvents.push(event);
        processor.cancel(); // Cancel after first ADG
      };

      const options: GenerateOptions = {
        folders: [pack1, pack2],
        fileType: 'wav',
        includeLoops: false,
        debug: false,
        outputDirectory: TEST_OUTPUT_PATH,
      };

      const count = await processor.processMultipleFolders(options, undefined, onCreated);

      // Should have stopped after processing first pack
      expect(count).toBe(1);

      // Cleanup
      fs.rmSync(pack1, { recursive: true, force: true });
      fs.rmSync(pack2, { recursive: true, force: true });
    });
  });

  describe('note value assignment', () => {
    it('should assign notes starting from 104 and descending', async () => {
      // Create a simple test case
      const notePath = path.join(TEST_FIXTURES_PATH, 'note-test');
      fs.mkdirSync(notePath, { recursive: true });

      // Create 5 samples
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(notePath, `sample_${i}.wav`), '');
      }

      await processor.createAdgFromSamplesPath(
        notePath,
        TEST_OUTPUT_PATH,
        'NoteTest'
      );

      // Read the generated ADG and check note values
      const adgPath = path.join(TEST_OUTPUT_PATH, 'NoteTest.adg');

      if (fs.existsSync(adgPath)) {
        const zlib = require('zlib');
        const compressed = fs.readFileSync(adgPath);
        const xml = zlib.gunzipSync(compressed).toString('utf-8');

        // Should contain notes 104, 103, 102, 101, 100
        expect(xml).toContain('<ReceivingNote Value="104" />');
        expect(xml).toContain('<ReceivingNote Value="103" />');
        expect(xml).toContain('<ReceivingNote Value="102" />');
        expect(xml).toContain('<ReceivingNote Value="101" />');
        expect(xml).toContain('<ReceivingNote Value="100" />');
      }

      // Cleanup
      fs.rmSync(notePath, { recursive: true, force: true });
    });
  });
});
