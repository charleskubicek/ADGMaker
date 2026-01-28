import React, { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: (libraryPath: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'detecting' | 'found' | 'notfound' | 'manual'>('detecting');
  const [detectedPath, setDetectedPath] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect on mount
  useEffect(() => {
    detectLibrary();
  }, []);

  const detectLibrary = async () => {
    setStatus('detecting');
    setError(null);

    try {
      const result = await window.electronAPI.detectLibrary();

      if (result.autoDetected && result.path) {
        setDetectedPath(result.path);
        setStatus('found');
      } else {
        setStatus('notfound');
      }
    } catch (err) {
      setError('Failed to detect Ableton library');
      setStatus('notfound');
    }
  };

  const handleUseDetected = () => {
    if (detectedPath) {
      onComplete(detectedPath);
    }
  };

  const handleBrowse = async () => {
    try {
      const result = await window.electronAPI.selectLibraryPath();

      if (result) {
        setManualPath(result.path);
        setIsValid(result.isValid);

        if (!result.isValid) {
          setError('This folder does not appear to be a valid Ableton User Library. You can still use it, but ADG files may not appear in Ableton automatically.');
        } else {
          setError(null);
        }
      }
    } catch (err) {
      setError('Failed to select folder');
    }
  };

  const handleUseManual = () => {
    if (manualPath) {
      onComplete(manualPath);
    }
  };

  const handleSkip = async () => {
    // Use a default output directory
    const result = await window.electronAPI.selectOutputDirectory();
    if (result) {
      onComplete(result);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        <h1>Welcome to ADGMaker</h1>
        <p className="subtitle">Let's set up your Ableton Live User Library</p>

        {status === 'detecting' && (
          <div className="onboarding-section">
            <div className="detecting">
              <span className="spinner large"></span>
              <p>Detecting Ableton Live User Library...</p>
            </div>
          </div>
        )}

        {status === 'found' && detectedPath && (
          <div className="onboarding-section">
            <div className="detected-success">
              <span className="icon success">✓</span>
              <h2>Ableton Library Found!</h2>
              <p className="path">{detectedPath}</p>
              <p className="hint">
                ADG files will be saved to your Drum Rack presets folder and will
                appear automatically in Ableton Live.
              </p>
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-primary btn-large" onClick={handleUseDetected}>
                Use This Location
              </button>
              <button className="btn btn-secondary" onClick={() => setStatus('manual')}>
                Choose Different Location
              </button>
            </div>
          </div>
        )}

        {status === 'notfound' && (
          <div className="onboarding-section">
            <div className="not-found">
              <span className="icon warning">!</span>
              <h2>Ableton Library Not Found</h2>
              <p>
                We couldn't automatically detect your Ableton Live User Library.
                Please select the folder manually.
              </p>
              <p className="hint">
                The User Library is typically located at:
                <br />
                <strong>macOS:</strong> ~/Music/Ableton/User Library
                <br />
                <strong>Windows:</strong> Documents\Ableton\User Library
              </p>
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-primary btn-large" onClick={handleBrowse}>
                Browse for User Library
              </button>
              <button className="btn btn-secondary" onClick={handleSkip}>
                Skip and Choose Output Later
              </button>
            </div>
          </div>
        )}

        {status === 'manual' && (
          <div className="onboarding-section">
            <h2>Select Your Ableton User Library</h2>

            {manualPath ? (
              <div className={`selected-path ${isValid ? 'valid' : 'warning'}`}>
                <p className="path">{manualPath}</p>
                {!isValid && (
                  <p className="warning-text">
                    This may not be a valid Ableton User Library
                  </p>
                )}
              </div>
            ) : (
              <p>Click the button below to select your Ableton User Library folder.</p>
            )}

            {error && <p className="error-text">{error}</p>}

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={handleBrowse}>
                {manualPath ? 'Choose Different Folder' : 'Browse'}
              </button>
              {manualPath && (
                <button className="btn btn-primary btn-large" onClick={handleUseManual}>
                  Use This Location
                </button>
              )}
              <button className="btn btn-link" onClick={() => setStatus('notfound')}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
