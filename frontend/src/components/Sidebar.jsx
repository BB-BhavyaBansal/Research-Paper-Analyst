import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Sparkles,
  History,
  Trash2,
  AlertCircle,
  FileCheck,
  Layers
} from 'lucide-react';

export default function Sidebar({
  selectedFile,
  fileMetadata,
  isUploading,
  isAnalyzing,
  uploadError,
  onFileSelect,
  onRemoveFile,
  onAnalyze,
  history,
  activeFileId,
  onSelectHistoryItem,
  onDeleteHistoryItem
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <aside className="sidebar">
      {/* Upload Box Card */}
      <div className="card">
        <h3 className="card-title">
          <UploadCloud className="icon" size={18} />
          Upload Research Paper
        </h3>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
        />

        {/* Dropzone */}
        {!selectedFile ? (
          <div
            className={`dropzone ${isDragOver ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <div className="dropzone-title">Drag & drop research paper</div>
            <div className="dropzone-subtitle">
              PDF format • Up to 25 MB
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </button>
          </div>
        ) : (
          /* Selected File View */
          <div>
            <div className="selected-file-box">
              <div className="file-info">
                <div className="file-icon-badge">
                  <FileText size={18} />
                </div>
                <div className="file-details">
                  <div className="file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div className="file-meta">
                    {formatFileSize(selectedFile.size)}
                    {fileMetadata?.total_pages && ` • ${fileMetadata.total_pages} pages`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={onRemoveFile}
                title="Remove file and choose another"
                disabled={isAnalyzing}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scanned Warning if detected */}
            {fileMetadata?.is_scanned && (
              <div className="alert alert-warning" style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem' }}>
                  This PDF might be a scanned image. Text extraction may be limited.
                </span>
              </div>
            )}

            {/* Analyze CTA Button */}
            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: '1rem' }}
              onClick={onAnalyze}
              disabled={isAnalyzing || isUploading}
            >
              <Sparkles size={16} />
              {isAnalyzing
                ? 'Analyzing Paper with Gemini...'
                : isUploading
                ? 'Reading PDF...'
                : 'Analyze Paper'}
            </button>
          </div>
        )}

        {/* Upload error display */}
        {uploadError && (
          <div className="alert alert-danger" style={{ marginTop: '0.85rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* History of Analyzed Papers */}
      <div className="card">
        <h3 className="card-title">
          <History className="icon" size={18} />
          Previous Analyses
        </h3>

        {history && history.length > 0 ? (
          <div className="history-list">
            {history.map((item) => {
              const isActive = item.file_id === activeFileId;
              return (
                <div
                  key={item.file_id}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectHistoryItem(item.file_id)}
                >
                  <div className="history-item-content">
                    <div className="history-item-title" title={item.title || item.filename}>
                      {item.title || item.filename}
                    </div>
                    <div className="history-item-sub">
                      <span>{item.core_domain || 'Research'}</span>
                      {item.total_pages && <span>• {item.total_pages}p</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    title="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistoryItem(item.file_id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="history-empty">
            <Layers size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p>No papers analyzed yet.</p>
            <p style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
              Uploaded analyses will appear here.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
