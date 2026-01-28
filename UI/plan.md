# ADGMaker Electron UI - Implementation Plan

## Overview

This document outlines the plan for building an Electron-based frontend for ADGMaker, a tool that generates Ableton Live Drum Rack instruments (.adg files) from sample packs. The UI will replicate the exact functionality of the Python backend (`adgmaker/adgmaker.py`) in TypeScript, using the same XML templates (`base_xml.tpl` and `instrument_xml.tpl`).

---

## 1. Project Architecture

### 1.1 Directory Structure

```
UI/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .gitignore
├── src/
│   ├── main/                      # Electron main process
│   │   ├── main.ts                # Main entry point
│   │   ├── ipc-handlers.ts        # IPC communication handlers
│   │   └── preload.ts             # Preload script for context bridge
│   ├── renderer/                  # Electron renderer process (UI)
│   │   ├── index.html             # Main HTML file
│   │   ├── index.tsx              # React entry point
│   │   ├── App.tsx                # Main React component
│   │   ├── styles/
│   │   │   └── main.css           # Application styles
│   │   └── components/
│   │       ├── FolderList.tsx     # Sample pack folder list component
│   │       ├── FolderItem.tsx     # Individual folder item
│   │       ├── SettingsPanel.tsx  # Settings (file type, include loops, etc.)
│   │       ├── GenerateButton.tsx # Generate ADG button
│   │       └── ProgressLog.tsx    # Generation progress/log display
│   ├── core/                      # Core ADG generation logic (shared)
│   │   ├── adg-maker.ts           # ADGMaker class (TypeScript port)
│   │   ├── sample-pack-processor.ts # SamplePackAdgMaker class (TypeScript port)
│   │   ├── template-renderer.ts   # Jinja2-like template rendering
│   │   └── types.ts               # TypeScript interfaces/types
│   └── templates/                 # XML templates (copied from Python)
│       ├── base_xml.tpl
│       └── instrument_xml.tpl
├── dist/                          # Compiled output
└── out/                           # Packaged application
```

### 1.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop Framework | Electron | Cross-platform desktop application |
| Language | TypeScript | Type-safe JavaScript |
| UI Framework | React | Component-based UI |
| Bundler | Webpack | Module bundling |
| Template Engine | Nunjucks | Jinja2-compatible template rendering |
| Compression | pako (zlib) | Gzip compression for .adg files |
| File Dialogs | Electron dialog API | Native folder selection |

---

## 2. Core Logic Translation (Python → TypeScript)

### 2.1 ADGMaker Class

The `ADGMaker` class in `adgmaker/adgmaker.py` (lines 15-111) must be ported to TypeScript with identical functionality.

#### Key Methods to Implement

| Python Method | TypeScript Method | Purpose |
|---------------|-------------------|---------|
| `__init__` | `constructor` | Initialize templates, file type, debug mode |
| `add_sample_file_to_instrument` | `addSampleFileToInstrument` | Map sample to ADG at MIDI note |
| `create_instrument_xml` | `createInstrumentXml` | Generate single instrument XML |
| `crate_path_hint` | `createPathHint` | Generate relative path XML elements |
| `create_base_xml` | `createBaseXml` | Render base template with all samples |
| `create_adg` | `createAdg` | Compress XML to .adg file |
| `empty_adgs` | `emptyAdgs` | Clear ADG dictionary |
| `all_adgs` | `getAllAdgs` | Return all ADGs |

#### Critical Implementation Details

1. **UTF-16 Hex Encoding** (Python line 70):
   ```python
   data = binascii.hexlify(file_path.encode('utf-16')).decode('utf-8').upper()
   ```
   TypeScript equivalent:
   ```typescript
   function encodeUtf16Hex(filePath: string): string {
     const encoder = new TextEncoder();
     // UTF-16LE with BOM
     const utf16Bytes = Buffer.from('\uFEFF' + filePath, 'utf16le');
     return utf16Bytes.toString('hex').toUpperCase();
   }
   ```

2. **Ableton Path Construction** (Python line 66):
   ```python
   ableton_path = "userfolder:" + file_path.rsplit(os.sep, 1)[0] + os.sep + '#' + file_name
   ```
   Must handle platform-specific path separators.

3. **Path Hint Generation** (Python lines 83-88):
   ```python
   def crate_path_hint(self, file_path):
       hint_els = []
       for part in file_path.rsplit(os.sep)[1:-1]:
           hint_els.append('<RelativePathElement Dir="%s" />' % part)
       return '\n'.join(hint_els)
   ```

### 2.2 SamplePackAdgMaker Class

The `SamplePackAdgMaker` class (lines 114-189) orchestrates batch processing.

#### Key Methods to Implement

| Python Method | TypeScript Method | Purpose |
|---------------|-------------------|---------|
| `handle` | N/A (replaced by UI) | CLI parsing (not needed) |
| `get_subdirs_containing_valid_samples` | `getSubdirsWithSamples` | Find valid sample subdirectories |
| `create_adg_from_samples_path` | `createAdgFromSamplesPath` | Main processing loop |

#### Critical Implementation Details

1. **Subdirectory Filtering** (Python lines 158-160):
   ```python
   return [p for p in Path(path).iterdir() if
           p.is_dir() and (include_loops is True or (include_loops is False and 'loop' not in p.name.lower()))]
   ```
   Filters out directories containing "loop" in name (case-insensitive).

2. **Sample Limit**: Maximum 104 samples per ADG (MIDI note range constraint)

3. **Note Assignment** (Python line 183):
   ```python
   note_value = 104 - i  # Descending from C8 (104)
   ```

4. **ADG Naming** (Python line 176):
   ```python
   adg_name = f'{given_name} - {subdir.name}'
   ```

---

## 3. Template Handling

### 3.1 Template Files

Copy the exact templates from `adgmaker/`:
- `base_xml.tpl` (397 lines) - Drum Rack container wrapper
- `instrument_xml.tpl` (1628 lines) - Individual sample instrument

### 3.2 Template Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `{{items}}` | Array of instrument XMLs | Injected into base template |
| `{{name}}` | Sample filename (no extension) | Display name in Ableton |
| `{{sample_file_name}}` | Full filename with extension | File reference |
| `{{note_value}}` | 104 down to 1 | MIDI note assignment |
| `{{ableton_path}}` | `userfolder:` + path + `#` + filename | Browser path |
| `{{path_hint_els}}` | Relative path XML elements | File discovery hints |
| `{{data}}` | UTF-16 hex-encoded path | Binary path data |

### 3.3 Template Rendering

Use Nunjucks (Jinja2-compatible for JavaScript):
```typescript
import * as nunjucks from 'nunjucks';

const env = nunjucks.configure(templatesPath, {
  trimBlocks: true,  // Match Python's trim_blocks=True
  autoescape: false  // Raw XML output
});

const xml = env.render('instrument_xml.tpl', {
  name,
  sample_file_name,
  note_value,
  ableton_path,
  path_hint_els,
  data
});
```

---

## 4. User Interface Design

### 4.1 Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ADGMaker                                           [─][□][×]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sample Pack Folders                          [+Add] │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  📁 /Users/me/Samples/Kicks               [Remove]  │   │
│  │  📁 /Users/me/Samples/Snares              [Remove]  │   │
│  │  📁 /Users/me/Samples/HiHats              [Remove]  │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Settings                                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  File Type:    [WAV ▼]                              │   │
│  │  ☐ Include Loop Folders                             │   │
│  │  ☐ Keep XML files (Debug)                           │   │
│  │  Output Directory: [/Users/me/ADGs]      [Browse]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [        Generate Selector Racks        ]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Progress                                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ✓ Created "Kicks - Acoustic.adg"                   │   │
│  │  ✓ Created "Kicks - Electronic.adg"                 │   │
│  │  ⏳ Processing "Snares"...                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Status: Ready                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Breakdown

#### FolderList Component
- Display list of added sample pack folders
- Add button opens native folder dialog
- Remove button for each folder
- Drag-and-drop support for adding folders

#### SettingsPanel Component
- File type dropdown (WAV, MP3, AIFF, FLAC)
- Include loops checkbox
- Debug mode checkbox
- Output directory selector

#### GenerateButton Component
- Large, prominent button
- Disabled when no folders added
- Shows spinner during generation

#### ProgressLog Component
- Scrollable log area
- Shows created files with checkmarks
- Shows current operation with spinner
- Shows errors in red

---

## 5. IPC Communication

### 5.1 Main Process → Renderer

| Channel | Data | Purpose |
|---------|------|---------|
| `adg:created` | `{ name: string, path: string }` | ADG file created |
| `adg:error` | `{ error: string }` | Error during generation |
| `adg:progress` | `{ current: number, total: number }` | Progress update |
| `adg:complete` | `{ count: number }` | All ADGs generated |

### 5.2 Renderer → Main Process

| Channel | Data | Purpose |
|---------|------|---------|
| `dialog:select-folder` | None | Open folder selection dialog |
| `dialog:select-output` | None | Open output directory dialog |
| `adg:generate` | `GenerateOptions` | Start ADG generation |
| `adg:cancel` | None | Cancel generation |

### 5.3 GenerateOptions Interface

```typescript
interface GenerateOptions {
  folders: string[];           // Array of sample pack folder paths
  fileType: 'wav' | 'mp3' | 'aiff' | 'flac';
  includeLoops: boolean;
  debug: boolean;
  outputDirectory: string;
  customNames?: Record<string, string>;  // folder path → custom name
}
```

---

## 6. File Operations

### 6.1 Gzip Compression

The .adg format is gzipped XML. Use Node.js zlib or pako:

```typescript
import * as zlib from 'zlib';
import * as fs from 'fs';

function createAdgFile(xmlContent: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
    zlib.gzip(xmlBuffer, (err, compressed) => {
      if (err) reject(err);
      else {
        fs.writeFile(outputPath, compressed, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}
```

### 6.2 File System Operations

- Use `fs.promises` for async file operations
- Use `path` module for cross-platform path handling
- Use `glob` or custom implementation for recursive file search

---

## 7. Implementation Phases

### Phase 1: Project Setup
1. Initialize npm project with TypeScript
2. Configure Electron, React, Webpack
3. Set up main/renderer process structure
4. Copy XML templates to `src/templates/`

### Phase 2: Core Logic
1. Implement `types.ts` with interfaces
2. Port `ADGMaker` class to TypeScript
3. Port `SamplePackAdgMaker` class to TypeScript
4. Implement template rendering with Nunjucks
5. Implement gzip compression
6. Write unit tests for core logic

### Phase 3: User Interface
1. Create basic React component structure
2. Implement FolderList component
3. Implement SettingsPanel component
4. Implement ProgressLog component
5. Style with CSS

### Phase 4: IPC Integration
1. Set up IPC handlers in main process
2. Implement preload script with context bridge
3. Connect UI components to IPC channels
4. Add file dialog integration

### Phase 5: Testing & Polish
1. End-to-end testing with real sample packs
2. Cross-platform testing (Windows, macOS, Linux)
3. Error handling improvements
4. UI polish and accessibility

### Phase 6: Packaging
1. Configure electron-builder
2. Create installers for each platform
3. Code signing (if applicable)
4. Auto-update configuration (optional)

---

## 8. Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "nunjucks": "^3.2.4"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/nunjucks": "^3.2.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0",
    "html-webpack-plugin": "^5.5.0",
    "electron-builder": "^24.0.0"
  }
}
```

---

## 9. Key Differences from Python Version

| Aspect | Python | TypeScript/Electron |
|--------|--------|---------------------|
| Entry Point | CLI (`argparse`) | GUI (Electron window) |
| File Dialogs | N/A | Native Electron dialogs |
| Progress Display | `print()` statements | Real-time UI updates |
| Multiple Folders | Single folder argument | Batch processing list |
| Template Engine | Jinja2 | Nunjucks (compatible) |
| Compression | Python `gzip` module | Node.js `zlib` module |
| Path Handling | `os.path` / `pathlib` | Node.js `path` module |

---

## 10. Testing Strategy

### Unit Tests
- Template rendering with known inputs
- UTF-16 hex encoding
- Path hint generation
- Subdirectory filtering logic

### Integration Tests
- Full ADG generation from sample folder
- Verify .adg files open in Ableton Live
- Cross-platform path handling

### Manual Testing
- Add/remove folders
- Generate with various settings
- Error scenarios (invalid paths, permissions)
- Large sample packs (100+ samples)

---

## 11. Future Enhancements (Out of Scope)

- Drag-and-drop reordering of samples
- Preview samples before generation
- Custom macro mapping configuration
- Batch rename samples
- Save/load project configurations
- Dark mode UI theme
