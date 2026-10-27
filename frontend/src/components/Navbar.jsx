import React from 'react';
import { BookOpen, Sparkles, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Navbar({
  healthStatus,
  onOpenKeyModal,
  onReset
}) {
  const isKeyConfigured = healthStatus?.gemini_api_key_configured;
  const isOnline = healthStatus?.status === 'online';

  return (
    <header className="navbar">
      <div className="nav-brand" onClick={onReset} title="Reset to Home">
        <div className="brand-icon-wrapper">
          <BookOpen size={22} strokeWidth={2.4} />
        </div>
        <div className="brand-text">
          <h1>
            Research Paper Analyst
            <span className="brand-badge">Gemini AI</span>
          </h1>
          <span className="brand-tagline">
            Understand complex academic papers in seconds
          </span>
        </div>
      </div>

      <div className="nav-actions">
        {/* Status indicator */}
        <button
          className="api-status-badge"
          onClick={onOpenKeyModal}
          title="Click to check API settings"
        >
          <span
            className={`status-dot ${
              !isOnline ? 'offline' : isKeyConfigured ? 'online' : 'warning'
            }`}
          />
          <span>
            {!isOnline
              ? 'Backend Offline'
              : isKeyConfigured
              ? 'Gemini Ready'
              : 'API Key Needed'}
          </span>
        </button>

        {/* Settings button */}
        <button
          className="btn btn-outline btn-sm"
          onClick={onOpenKeyModal}
          title="Configure Gemini API Key"
        >
          <Key size={14} />
          <span>API Key</span>
        </button>
      </div>
    </header>
  );
}
