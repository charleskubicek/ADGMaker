/**
 * SamplePackProcessor - Orchestrates batch processing of sample packs
 *
 * This is a TypeScript port of the Python SamplePackAdgMaker class from adgmaker/adgmaker.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { ADGMaker } from './adg-maker';
import {
  FileType,
  GenerateOptions,
  AdgCreatedEvent,
  AdgProgressEvent,
} from './types';

export type ProgressCallback = (event: AdgProgressEvent) => void;
export type CreatedCallback = (event: AdgCreatedEvent) => void;
export type ErrorCallback = (error: string) => void;

export class SamplePackProcessor {
  private fileType: FileType;
  private adgMaker: ADGMaker;
  private cancelled: boolean = false;

  constructor(templatesPath: string, fileType: FileType = 'wav', debug: boolean = false) {
    this.fileType = fileType;
    this.adgMaker = new ADGMaker(templatesPath, debug, fileType);
  }

  /**
   * Cancel the current operation
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Reset cancellation flag
   */
  reset(): void {
    this.cancelled = false;
  }

  /**
   * Get subdirectories containing valid samples
   *
   * @param dirPath - Path to search
   * @param includeLoops - Whether to include directories with "loop" in name
   * @returns Array of directory paths
   */
  async getSubdirsContainingValidSamples(
    dirPath: string,
    includeLoops: boolean = false
  ): Promise<string[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    const subdirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name.toLowerCase();
        // Python: include_loops is True or (include_loops is False and 'loop' not in p.name.lower())
        if (includeLoops || !name.includes('loop')) {
          subdirs.push(path.join(dirPath, entry.name));
        }
      }
    }

    return subdirs;
  }

  /**
   * Recursively find all sample files in a directory
   *
   * @param dirPath - Directory to search
   * @param fileType - File extension to look for
   * @returns Array of absolute file paths
   */
  async findSampleFiles(dirPath: string, fileType: FileType): Promise<string[]> {
    const extension = `.${fileType}`;
    const results: string[] = [];

    async function walk(currentPath: string): Promise<void> {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
          results.push(fullPath);
        }
      }
    }

    await walk(dirPath);
    return results;
  }

  /**
   * Create ADGs from a samples path
   *
   * @param samplesPath - Path to the sample pack folder
   * @param outputDir - Output directory for ADG files
   * @param givenName - Optional custom name (defaults to folder name)
   * @param includeLoops - Whether to include loop directories
   * @param onProgress - Progress callback
   * @param onCreated - Created callback
   * @param onError - Error callback
   */
  async createAdgFromSamplesPath(
    samplesPath: string,
    outputDir: string,
    givenName: string | null = null,
    includeLoops: boolean = false,
    onProgress?: ProgressCallback,
    onCreated?: CreatedCallback,
    onError?: ErrorCallback
  ): Promise<number> {
    // Reset state
    this.adgMaker.emptyAdgs();
    this.cancelled = false;

    // Get name from folder if not provided
    // Python: given_name = Path(samples_path).parts[-1]
    const name = givenName || path.basename(samplesPath);

    // Get subdirectories
    const subdirs = await this.getSubdirsContainingValidSamples(samplesPath, includeLoops);

    if (subdirs.length === 0) {
      // If no subdirs, treat the folder itself as having samples
      const samples = await this.findSampleFiles(samplesPath, this.fileType);
      if (samples.length > 0) {
        // Process the root folder
        await this.processSamplesForAdg(name, samples.slice(0, 104), onProgress);
      } else {
        onError?.(`No ${this.fileType} samples found in ${samplesPath}`);
        return 0;
      }
    } else {
      // Process each subdirectory
      let totalSubdirs = subdirs.length;
      let processedSubdirs = 0;

      for (const subdir of subdirs) {
        if (this.cancelled) {
          break;
        }

        const subdirName = path.basename(subdir);
        // Python: adg_name = f'{given_name} - {subdir.name}'
        const adgName = `${name} - ${subdirName}`;

        // Find samples (limit to 104)
        // Python: samples_list = list(Path(subdir).rglob(file_type_wildcard))[0:104]
        const samples = await this.findSampleFiles(subdir, this.fileType);
        const limitedSamples = samples.slice(0, 104);

        if (limitedSamples.length > 0) {
          await this.processSamplesForAdg(adgName, limitedSamples, onProgress);
        }

        processedSubdirs++;
        onProgress?.({
          current: processedSubdirs,
          total: totalSubdirs,
          currentFolder: subdirName,
        });
      }
    }

    // Generate all ADG files
    const allAdgs = this.adgMaker.getAllAdgs();
    let createdCount = 0;

    for (const [adgName, _instruments] of allAdgs) {
      if (this.cancelled) {
        break;
      }

      try {
        const finalXml = this.adgMaker.createBaseXml(adgName);
        const adgPath = await this.adgMaker.createAdg(adgName, finalXml, outputDir);
        createdCount++;
        onCreated?.({ name: adgName, path: adgPath });
      } catch (err) {
        onError?.(`Failed to create ${adgName}: ${err}`);
      }
    }

    return createdCount;
  }

  /**
   * Process samples for a single ADG
   */
  private async processSamplesForAdg(
    adgName: string,
    samples: string[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    for (let i = 0; i < samples.length; i++) {
      if (this.cancelled) {
        break;
      }

      const sampleFile = samples[i];
      const filePath = path.resolve(sampleFile);

      // Python: note_value = 104 - i
      const noteValue = 104 - i;

      this.adgMaker.addSampleFileToInstrument(filePath, adgName, noteValue);

      onProgress?.({
        current: i + 1,
        total: samples.length,
        currentFile: path.basename(sampleFile),
      });
    }
  }

  /**
   * Process multiple folders
   *
   * @param options - Generation options
   * @param onProgress - Progress callback
   * @param onCreated - Created callback
   * @param onError - Error callback
   * @returns Total number of ADGs created
   */
  async processMultipleFolders(
    options: GenerateOptions,
    onProgress?: ProgressCallback,
    onCreated?: CreatedCallback,
    onError?: ErrorCallback
  ): Promise<number> {
    let totalCreated = 0;

    for (const folder of options.folders) {
      if (this.cancelled) {
        break;
      }

      const customName = options.customNames?.[folder] || null;

      try {
        const count = await this.createAdgFromSamplesPath(
          folder,
          options.outputDirectory,
          customName,
          options.includeLoops,
          onProgress,
          onCreated,
          onError
        );
        totalCreated += count;
      } catch (err) {
        onError?.(`Error processing ${folder}: ${err}`);
      }
    }

    return totalCreated;
  }
}
