import React from 'react';

interface FolderListProps {
  folders: string[];
  onAddFolder: () => void;
  onRemoveFolder: (folder: string) => void;
  disabled: boolean;
}

const FolderList: React.FC<FolderListProps> = ({
  folders,
  onAddFolder,
  onRemoveFolder,
  disabled,
}) => {
  // Get display name for a folder path
  const getDisplayName = (folderPath: string): string => {
    const parts = folderPath.split(/[/\\]/);
    return parts[parts.length - 1] || folderPath;
  };

  return (
    <section className="panel folder-list">
      <div className="panel-header">
        <h2>Sample Pack Folders</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={onAddFolder}
          disabled={disabled}
        >
          + Add Folder
        </button>
      </div>

      <div className="panel-content">
        {folders.length === 0 ? (
          <div className="empty-state">
            <p>No folders added yet.</p>
            <p className="hint">Click "Add Folder" to select a sample pack directory.</p>
          </div>
        ) : (
          <ul className="folder-items">
            {folders.map((folder, index) => (
              <li key={index} className="folder-item">
                <span className="folder-icon">📁</span>
                <span className="folder-name" title={folder}>
                  {getDisplayName(folder)}
                </span>
                <span className="folder-path" title={folder}>
                  {folder}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onRemoveFolder(folder)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default FolderList;
