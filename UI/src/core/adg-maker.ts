/**
 * ADGMaker - Core class for generating Ableton Live Drum Rack instruments
 *
 * This is a TypeScript port of the Python ADGMaker class from adgmaker/adgmaker.py
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as nunjucks from 'nunjucks';
import { FileType, AdgData } from './types';

export class ADGMaker {
  private fileType: FileType;
  private debug: boolean;
  private adgs: Map<string, string[]>;
  private defaultNote: number;
  private nunjucksEnv: nunjucks.Environment;
  private templatesPath: string;

  constructor(templatesPath: string, debug: boolean = false, fileType: FileType = 'wav') {
    this.fileType = fileType;
    this.debug = debug;
    this.adgs = new Map();
    this.defaultNote = 104;
    this.templatesPath = templatesPath;

    // Configure nunjucks similar to Jinja2 with trim_blocks=True
    this.nunjucksEnv = nunjucks.configure(templatesPath, {
      trimBlocks: true,
      autoescape: false,
    });
  }

  /**
   * Clear all ADG data
   */
  emptyAdgs(): void {
    this.adgs.clear();
  }

  /**
   * Get all ADGs
   */
  getAllAdgs(): Map<string, string[]> {
    return this.adgs;
  }

  /**
   * Add a sample file to an instrument/ADG
   *
   * @param filePath - Absolute path to the sample file
   * @param adgName - Name of the ADG to add to
   * @param noteValue - MIDI note value (0-127)
   */
  addSampleFileToInstrument(filePath: string, adgName: string, noteValue: number): void {
    const instrumentXml = this.createInstrumentXml(filePath, noteValue);

    if (!this.adgs.has(adgName)) {
      this.adgs.set(adgName, []);
    }

    this.adgs.get(adgName)!.push(instrumentXml);
  }

  /**
   * Create the base XML for an ADG
   *
   * @param adgName - Name of the ADG
   * @returns Complete XML string for the ADG
   */
  createBaseXml(adgName: string): string {
    const items = this.adgs.get(adgName) || [];

    const xml = this.nunjucksEnv.render('base_xml.tpl', {
      items: items,
    });

    return xml;
  }

  /**
   * Create instrument XML for a single sample
   *
   * @param filePath - Absolute path to the sample file
   * @param noteValue - MIDI note value
   * @returns Instrument XML string
   */
  createInstrumentXml(filePath: string, noteValue: number): string {
    const dotFileType = '.' + this.fileType;
    const sep = path.sep;

    // Extract name without extension
    // Python: name = file_path.split(dot_file_type)[0].split(os.sep)[-1]
    const baseName = path.basename(filePath);
    const name = baseName.replace(new RegExp(`\\${dotFileType}$`, 'i'), '');
    const fileName = name + dotFileType;

    // Create Ableton path
    // Python: ableton_path = "userfolder:" + file_path.rsplit(os.sep, 1)[0] + os.sep + '#' + file_name
    const dirPath = path.dirname(filePath);
    const abletonPath = `userfolder:${dirPath}${sep}#${fileName}`;

    // Create path hint elements
    const pathHintEls = this.createPathHint(filePath);

    // Encode file path as UTF-16 hex
    // Python: data = binascii.hexlify(file_path.encode('utf-16')).decode('utf-8').upper()
    const data = this.encodeUtf16Hex(filePath);

    const xml = this.nunjucksEnv.render('instrument_xml.tpl', {
      path_hint_els: pathHintEls,
      name: name,
      sample_file_name: fileName,
      note_value: noteValue,
      ableton_path: abletonPath,
      data: data,
    });

    return xml;
  }

  /**
   * Create path hint XML elements for Ableton's file discovery
   *
   * @param filePath - Absolute path to the sample file
   * @returns String of XML RelativePathElement tags
   */
  createPathHint(filePath: string): string {
    // Python: for part in file_path.rsplit(os.sep)[1:-1]:
    //             hint_els.append('<RelativePathElement Dir="%s" />' % part)
    const parts = filePath.split(path.sep);
    // Skip first (empty or drive) and last (filename) parts
    const dirParts = parts.slice(1, -1);

    const hintEls = dirParts.map(part => `<RelativePathElement Dir="${part}" />`);
    return hintEls.join('\n');
  }

  /**
   * Encode a file path as UTF-16 hex (for Ableton's Data field)
   *
   * @param filePath - File path to encode
   * @returns Uppercase hex string
   */
  encodeUtf16Hex(filePath: string): string {
    // Python encodes as UTF-16 which includes BOM (Byte Order Mark)
    // Buffer.from with utf16le doesn't include BOM, so we add it
    const withBom = '\uFEFF' + filePath;
    const buffer = Buffer.from(withBom, 'utf16le');
    return buffer.toString('hex').toUpperCase();
  }

  /**
   * Create the final ADG file (gzipped XML)
   *
   * @param adgName - Name of the ADG
   * @param xml - XML content
   * @param outputDir - Output directory path
   * @returns Promise resolving to the created file path
   */
  async createAdg(adgName: string, xml: string, outputDir: string): Promise<string> {
    const xmlName = path.join(outputDir, `${adgName}.xml`);
    const adgFile = path.join(outputDir, `${adgName}.adg`);

    // Write XML file
    await fs.promises.writeFile(xmlName, xml, 'utf-8');

    // Gzip the XML file to create .adg
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(xmlName);
      const writeStream = fs.createWriteStream(adgFile);
      const gzipStream = zlib.createGzip();

      readStream
        .pipe(gzipStream)
        .pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Remove XML file if not in debug mode
    if (!this.debug) {
      await fs.promises.unlink(xmlName);
    }

    return adgFile;
  }

  /**
   * Get the file type extension
   */
  getFileType(): FileType {
    return this.fileType;
  }

  /**
   * Get the default note value
   */
  getDefaultNote(): number {
    return this.defaultNote;
  }
}
