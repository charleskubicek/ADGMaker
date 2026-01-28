import React, { useState, useEffect, useCallback } from 'react';
import FolderList from './components/FolderList';
import SettingsPanel from './components/SettingsPanel';
import GenerateButton from './components/GenerateButton';
import ProgressLog from './components/ProgressLog';
import { FileType, AdgCreatedEvent, AdgErrorEvent, AdgProgressEvent, AdgCompleteEvent } from '../core/types';

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  timestamp: Date;
}

const App: React.FC = () => {
  // State
  const [folders, setFolders] = useState<string[]>([]);
  const [fileType, setFileType] = useState<FileType>('wav');
  const [includeLoops, setIncludeLoops] = useState(false);
  const [debug, setDebug] = useState(false);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logIdCounter, setLogIdCounter] = useState(0);

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogIdCounter(prev => {
      const newId = prev + 1;
      setLogs(logs => [...logs, { id: newId, type, message, timestamp: new Date() }]);
      return newId;
    });
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Set up IPC listeners
  useEffect(() => {
    const unsubCreated = window.electronAPI.onAdgCreated((event: AdgCreatedEvent) => {
      addLog('success', `Created: ${event.name}.adg`);
    });

    const unsubError = window.electronAPI.onAdgError((event: AdgErrorEvent) => {
      addLog('error', event.error);
    });

    const unsubProgress = window.electronAPI.onAdgProgress((event: AdgProgressEvent) => {
      if (event.currentFile) {
        addLog('progress', `Processing: ${event.currentFile}`);
      } else if (event.currentFolder) {
        addLog('info', `Processing folder: ${event.currentFolder}`);
      }
    });

    const unsubComplete = window.electronAPI.onAdgComplete((event: AdgCompleteEvent) => {
      addLog('success', `Complete! Created ${event.count} ADG file(s)`);
      setIsGenerating(false);
    });

    // Cleanup
    return () => {
      unsubCreated();
      unsubError();
      unsubProgress();
      unsubComplete();
    };
  }, [addLog]);

  // Handle adding a folder
  const handleAddFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder && !folders.includes(folder)) {
      setFolders([...folders, folder]);
    }
  };

  // Handle removing a folder
  const handleRemoveFolder = (folder: string) => {
    setFolders(folders.filter(f => f !== folder));
  };

  // Handle selecting output directory
  const handleSelectOutput = async () => {
    const dir = await window.electronAPI.selectOutputDirectory();
    if (dir) {
      setOutputDirectory(dir);
    }
  };

  // Handle generate
  const handleGenerate = () => {
    if (folders.length === 0) {
      addLog('error', 'Please add at least one sample pack folder');
      return;
    }

    if (!outputDirectory) {
      addLog('error', 'Please select an output directory');
      return;
    }

    clearLogs();
    setIsGenerating(true);
    addLog('info', 'Starting ADG generation...');

    window.electronAPI.generate({
      folders,
      fileType,
      includeLoops,
      debug,
      outputDirectory,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    window.electronAPI.cancelGeneration();
    addLog('info', 'Cancelling...');
    setIsGenerating(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>ADGMaker</h1>
        <p className="subtitle">Create Ableton Live Selector Racks from Sample Packs</p>
      </header>

      <main className="app-main">
        <FolderList
          folders={folders}
          onAddFolder={handleAddFolder}
          onRemoveFolder={handleRemoveFolder}
          disabled={isGenerating}
        />

        <SettingsPanel
          fileType={fileType}
          onFileTypeChange={setFileType}
          includeLoops={includeLoops}
          onIncludeLoopsChange={setIncludeLoops}
          debug={debug}
          onDebugChange={setDebug}
          outputDirectory={outputDirectory}
          onSelectOutput={handleSelectOutput}
          disabled={isGenerating}
        />

        <GenerateButton
          onGenerate={handleGenerate}
          onCancel={handleCancel}
          isGenerating={isGenerating}
          disabled={folders.length === 0 || !outputDirectory}
        />

        <ProgressLog logs={logs} />
      </main>

      <footer className="app-footer">
        <span>Ready</span>
      </footer>
    </div>
  );
};

export default App;
