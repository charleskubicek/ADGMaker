import React from 'react';
import { FileType } from '../../core/types';

interface SettingsPanelProps {
  fileType: FileType;
  onFileTypeChange: (type: FileType) => void;
  includeLoops: boolean;
  onIncludeLoopsChange: (include: boolean) => void;
  debug: boolean;
  onDebugChange: (debug: boolean) => void;
  outputDirectory: string;
  onSelectOutput: () => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  fileType,
  onFileTypeChange,
  includeLoops,
  onIncludeLoopsChange,
  debug,
  onDebugChange,
  outputDirectory,
  onSelectOutput,
  disabled,
}) => {
  return (
    <section className="panel settings-panel">
      <div className="panel-header">
        <h2>Settings</h2>
      </div>

      <div className="panel-content">
        <div className="setting-row">
          <label htmlFor="fileType">File Type:</label>
          <select
            id="fileType"
            value={fileType}
            onChange={(e) => onFileTypeChange(e.target.value as FileType)}
            disabled={disabled}
          >
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
            <option value="aiff">AIFF</option>
            <option value="flac">FLAC</option>
          </select>
        </div>

        <div className="setting-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeLoops}
              onChange={(e) => onIncludeLoopsChange(e.target.checked)}
              disabled={disabled}
            />
            <span>Include Loop Folders</span>
          </label>
          <span className="hint">Include subdirectories with "loop" in the name</span>
        </div>

        <div className="setting-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => onDebugChange(e.target.checked)}
              disabled={disabled}
            />
            <span>Keep XML Files (Debug)</span>
          </label>
          <span className="hint">Don't delete intermediate XML files</span>
        </div>

        <div className="setting-row">
          <label htmlFor="outputDir">Output Directory:</label>
          <div className="output-selector">
            <input
              type="text"
              id="outputDir"
              value={outputDirectory}
              readOnly
              placeholder="Select output directory..."
            />
            <button
              className="btn btn-secondary"
              onClick={onSelectOutput}
              disabled={disabled}
            >
              Browse
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SettingsPanel;
