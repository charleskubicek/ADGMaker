import React, { useEffect, useRef } from 'react';

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  timestamp: Date;
}

interface ProgressLogProps {
  logs: LogEntry[];
}

const ProgressLog: React.FC<ProgressLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Get icon for log type
  const getIcon = (type: LogEntry['type']): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'progress':
        return '⏳';
      case 'info':
      default:
        return '→';
    }
  };

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <section className="panel progress-log">
      <div className="panel-header">
        <h2>Progress</h2>
      </div>

      <div className="panel-content log-container" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>No activity yet.</p>
          </div>
        ) : (
          <ul className="log-entries">
            {logs.map((log) => (
              <li key={log.id} className={`log-entry log-${log.type}`}>
                <span className="log-icon">{getIcon(log.type)}</span>
                <span className="log-time">{formatTime(log.timestamp)}</span>
                <span className="log-message">{log.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ProgressLog;
