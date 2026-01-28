/**
 * Unit Tests for ADGMaker class
 *
 * Tests the core ADG generation logic including:
 * - UTF-16 hex encoding
 * - Path hint generation
 * - Instrument XML creation
 * - Base XML creation
 * - ADG file creation (gzip compression)
 */

import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { ADGMaker } from '../core/adg-maker';
import { TEST_TEMPLATES_PATH, TEST_OUTPUT_PATH } from './setup';

describe('ADGMaker', () => {
  let adgMaker: ADGMaker;

  beforeEach(() => {
    adgMaker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'wav');
  });

  afterEach(() => {
    adgMaker.emptyAdgs();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const maker = new ADGMaker(TEST_TEMPLATES_PATH);
      expect(maker.getFileType()).toBe('wav');
      expect(maker.getDefaultNote()).toBe(104);
    });

    it('should accept custom file type', () => {
      const maker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'mp3');
      expect(maker.getFileType()).toBe('mp3');
    });

    it('should accept different file types', () => {
      const wavMaker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'wav');
      const mp3Maker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'mp3');
      const aiffMaker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'aiff');
      const flacMaker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'flac');

      expect(wavMaker.getFileType()).toBe('wav');
      expect(mp3Maker.getFileType()).toBe('mp3');
      expect(aiffMaker.getFileType()).toBe('aiff');
      expect(flacMaker.getFileType()).toBe('flac');
    });
  });

  describe('encodeUtf16Hex', () => {
    it('should encode a simple path to UTF-16 hex with BOM', () => {
      const result = adgMaker.encodeUtf16Hex('/test/path.wav');

      // UTF-16LE BOM is FFFE
      expect(result.startsWith('FFFE')).toBe(true);
      // Result should be uppercase hex
      expect(result).toBe(result.toUpperCase());
      // Should only contain hex characters
      expect(/^[0-9A-F]+$/.test(result)).toBe(true);
    });

    it('should encode paths with special characters', () => {
      const result = adgMaker.encodeUtf16Hex('/path/with spaces/file.wav');

      expect(result.startsWith('FFFE')).toBe(true);
      expect(/^[0-9A-F]+$/.test(result)).toBe(true);
    });

    it('should encode paths with unicode characters', () => {
      const result = adgMaker.encodeUtf16Hex('/path/müsic/sämple.wav');

      expect(result.startsWith('FFFE')).toBe(true);
      expect(/^[0-9A-F]+$/.test(result)).toBe(true);
    });

    it('should produce consistent output for same input', () => {
      const path1 = '/test/sample.wav';
      const result1 = adgMaker.encodeUtf16Hex(path1);
      const result2 = adgMaker.encodeUtf16Hex(path1);

      expect(result1).toBe(result2);
    });

    it('should match Python binascii.hexlify output format', () => {
      // Test with a known simple string
      const result = adgMaker.encodeUtf16Hex('test');

      // 'test' in UTF-16LE with BOM:
      // BOM: FF FE (appears as FFFE in little-endian hex)
      // 't': 74 00
      // 'e': 65 00
      // 's': 73 00
      // 't': 74 00
      expect(result).toBe('FFFE7400650073007400');
    });
  });

  describe('createPathHint', () => {
    it('should create path hint elements for a Unix path', () => {
      const result = adgMaker.createPathHint('/Users/test/Music/Samples/kick.wav');

      expect(result).toContain('<RelativePathElement Dir="Users" />');
      expect(result).toContain('<RelativePathElement Dir="test" />');
      expect(result).toContain('<RelativePathElement Dir="Music" />');
      expect(result).toContain('<RelativePathElement Dir="Samples" />');
      // Should not contain the filename
      expect(result).not.toContain('kick.wav');
      // Should not contain the root
      expect(result).not.toContain('Dir="" />');
    });

    it('should handle paths with multiple levels', () => {
      const result = adgMaker.createPathHint('/a/b/c/d/e/file.wav');
      const elements = result.split('\n');

      expect(elements.length).toBe(5); // a, b, c, d, e (not root, not file)
    });

    it('should handle paths with spaces in directory names', () => {
      const result = adgMaker.createPathHint('/Users/test/My Music/Sample Packs/kick.wav');

      expect(result).toContain('<RelativePathElement Dir="My Music" />');
      expect(result).toContain('<RelativePathElement Dir="Sample Packs" />');
    });

    it('should return empty string for root-level file', () => {
      // A file directly in root would have no intermediate directories
      const result = adgMaker.createPathHint('/file.wav');

      expect(result).toBe('');
    });
  });

  describe('addSampleFileToInstrument', () => {
    it('should add a sample to a new ADG', () => {
      adgMaker.addSampleFileToInstrument('/test/sample.wav', 'TestADG', 104);

      const adgs = adgMaker.getAllAdgs();
      expect(adgs.has('TestADG')).toBe(true);
      expect(adgs.get('TestADG')?.length).toBe(1);
    });

    it('should add multiple samples to the same ADG', () => {
      adgMaker.addSampleFileToInstrument('/test/sample1.wav', 'TestADG', 104);
      adgMaker.addSampleFileToInstrument('/test/sample2.wav', 'TestADG', 103);
      adgMaker.addSampleFileToInstrument('/test/sample3.wav', 'TestADG', 102);

      const adgs = adgMaker.getAllAdgs();
      expect(adgs.get('TestADG')?.length).toBe(3);
    });

    it('should create separate ADGs for different names', () => {
      adgMaker.addSampleFileToInstrument('/test/kick.wav', 'Kicks', 104);
      adgMaker.addSampleFileToInstrument('/test/snare.wav', 'Snares', 104);

      const adgs = adgMaker.getAllAdgs();
      expect(adgs.size).toBe(2);
      expect(adgs.has('Kicks')).toBe(true);
      expect(adgs.has('Snares')).toBe(true);
    });
  });

  describe('emptyAdgs', () => {
    it('should clear all ADGs', () => {
      adgMaker.addSampleFileToInstrument('/test/sample1.wav', 'ADG1', 104);
      adgMaker.addSampleFileToInstrument('/test/sample2.wav', 'ADG2', 103);

      expect(adgMaker.getAllAdgs().size).toBe(2);

      adgMaker.emptyAdgs();

      expect(adgMaker.getAllAdgs().size).toBe(0);
    });
  });

  describe('createInstrumentXml', () => {
    it('should create valid XML with correct template variables', () => {
      const xml = adgMaker.createInstrumentXml('/Users/test/Samples/kick_01.wav', 104);

      // Check that key elements are present
      expect(xml).toContain('<DrumBranchPreset>');
      expect(xml).toContain('</DrumBranchPreset>');
      expect(xml).toContain('<Name Value="kick_01" />');
      expect(xml).toContain('<ReceivingNote Value="104" />');
    });

    it('should use the correct file name in XML', () => {
      const xml = adgMaker.createInstrumentXml('/path/to/my_sample.wav', 100);

      expect(xml).toContain('Value="my_sample.wav"');
      expect(xml).toContain('<Name Value="my_sample" />');
    });

    it('should include the ableton path format', () => {
      const xml = adgMaker.createInstrumentXml('/Users/test/Samples/kick.wav', 104);

      expect(xml).toContain('userfolder:');
      expect(xml).toContain('#kick.wav');
    });

    it('should include path hints', () => {
      const xml = adgMaker.createInstrumentXml('/Users/test/Music/Samples/kick.wav', 104);

      expect(xml).toContain('<RelativePathElement Dir="Users" />');
      expect(xml).toContain('<RelativePathElement Dir="Samples" />');
    });

    it('should include hex-encoded data', () => {
      const xml = adgMaker.createInstrumentXml('/test/sample.wav', 104);

      // Should contain hex data (starts with BOM FFFE)
      expect(xml).toContain('FFFE');
    });

    it('should handle different note values', () => {
      const xml104 = adgMaker.createInstrumentXml('/test/sample.wav', 104);
      const xml60 = adgMaker.createInstrumentXml('/test/sample.wav', 60);
      const xml1 = adgMaker.createInstrumentXml('/test/sample.wav', 1);

      expect(xml104).toContain('<ReceivingNote Value="104" />');
      expect(xml60).toContain('<ReceivingNote Value="60" />');
      expect(xml1).toContain('<ReceivingNote Value="1" />');
    });
  });

  describe('createBaseXml', () => {
    it('should create valid base XML structure', () => {
      adgMaker.addSampleFileToInstrument('/test/sample.wav', 'TestADG', 104);
      const xml = adgMaker.createBaseXml('TestADG');

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Ableton');
      expect(xml).toContain('</Ableton>');
      expect(xml).toContain('<DrumGroupDevice>');
      expect(xml).toContain('<BranchPresets>');
    });

    it('should include all added instruments', () => {
      adgMaker.addSampleFileToInstrument('/test/sample1.wav', 'TestADG', 104);
      adgMaker.addSampleFileToInstrument('/test/sample2.wav', 'TestADG', 103);

      const xml = adgMaker.createBaseXml('TestADG');

      // Count DrumBranchPreset occurrences
      const matches = xml.match(/<DrumBranchPreset>/g);
      expect(matches?.length).toBe(2);
    });

    it('should return empty base XML for non-existent ADG', () => {
      const xml = adgMaker.createBaseXml('NonExistent');

      // Should still have base structure but no instruments
      expect(xml).toContain('<BranchPresets>');
      expect(xml).toContain('</BranchPresets>');
      expect(xml).not.toContain('<DrumBranchPreset>');
    });

    it('should include macro controls', () => {
      adgMaker.addSampleFileToInstrument('/test/sample.wav', 'TestADG', 104);
      const xml = adgMaker.createBaseXml('TestADG');

      expect(xml).toContain('<MacroControls.0>');
      expect(xml).toContain('<MacroControls.7>');
    });
  });

  describe('createAdg', () => {
    it('should create a gzipped ADG file', async () => {
      adgMaker.addSampleFileToInstrument('/test/sample.wav', 'TestADG', 104);
      const xml = adgMaker.createBaseXml('TestADG');

      const adgPath = await adgMaker.createAdg('TestADG', xml, TEST_OUTPUT_PATH);

      expect(fs.existsSync(adgPath)).toBe(true);
      expect(adgPath.endsWith('.adg')).toBe(true);
    });

    it('should create valid gzip file that can be decompressed', async () => {
      adgMaker.addSampleFileToInstrument('/test/sample.wav', 'TestADG', 104);
      const xml = adgMaker.createBaseXml('TestADG');

      const adgPath = await adgMaker.createAdg('TestGzip', xml, TEST_OUTPUT_PATH);

      // Read and decompress
      const compressed = fs.readFileSync(adgPath);
      const decompressed = zlib.gunzipSync(compressed).toString('utf-8');

      expect(decompressed).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(decompressed).toContain('<Ableton');
    });

    it('should remove XML file in non-debug mode', async () => {
      const maker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'wav');
      maker.addSampleFileToInstrument('/test/sample.wav', 'TestNoDebug', 104);
      const xml = maker.createBaseXml('TestNoDebug');

      await maker.createAdg('TestNoDebug', xml, TEST_OUTPUT_PATH);

      const xmlPath = path.join(TEST_OUTPUT_PATH, 'TestNoDebug.xml');
      expect(fs.existsSync(xmlPath)).toBe(false);
    });

    it('should keep XML file in debug mode', async () => {
      const maker = new ADGMaker(TEST_TEMPLATES_PATH, true, 'wav');
      maker.addSampleFileToInstrument('/test/sample.wav', 'TestDebug', 104);
      const xml = maker.createBaseXml('TestDebug');

      await maker.createAdg('TestDebug', xml, TEST_OUTPUT_PATH);

      const xmlPath = path.join(TEST_OUTPUT_PATH, 'TestDebug.xml');
      expect(fs.existsSync(xmlPath)).toBe(true);

      // Cleanup
      if (fs.existsSync(xmlPath)) {
        fs.unlinkSync(xmlPath);
      }
    });
  });

  describe('getFileType', () => {
    it('should return the configured file type', () => {
      expect(adgMaker.getFileType()).toBe('wav');

      const mp3Maker = new ADGMaker(TEST_TEMPLATES_PATH, false, 'mp3');
      expect(mp3Maker.getFileType()).toBe('mp3');
    });
  });

  describe('getDefaultNote', () => {
    it('should return 104 as the default note', () => {
      expect(adgMaker.getDefaultNote()).toBe(104);
    });
  });

  describe('integration: full ADG workflow', () => {
    it('should create a complete ADG with multiple samples', async () => {
      // Add multiple samples
      for (let i = 0; i < 10; i++) {
        const noteValue = 104 - i;
        adgMaker.addSampleFileToInstrument(`/test/samples/sample_${i}.wav`, 'FullTest', noteValue);
      }

      // Generate base XML
      const xml = adgMaker.createBaseXml('FullTest');

      // Verify XML contains all samples
      const matches = xml.match(/<DrumBranchPreset>/g);
      expect(matches?.length).toBe(10);

      // Create ADG file
      const adgPath = await adgMaker.createAdg('FullTest', xml, TEST_OUTPUT_PATH);

      // Verify file exists and is valid
      expect(fs.existsSync(adgPath)).toBe(true);

      const compressed = fs.readFileSync(adgPath);
      const decompressed = zlib.gunzipSync(compressed).toString('utf-8');

      // Verify decompressed content
      expect(decompressed).toContain('sample_0');
      expect(decompressed).toContain('sample_9');
      expect(decompressed).toContain('<ReceivingNote Value="104" />');
      expect(decompressed).toContain('<ReceivingNote Value="95" />');
    });
  });
});
