import React, { useState } from 'react';
import { Key, X, CheckCircle2, AlertCircle, ExternalLink, Loader2, Shield } from 'lucide-react';
import { verifyApiKey } from '../api';

export default function ApiKeyModal({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
  healthStatus
}) {
  const [apiKeyInput, setApiKeyInput] = useState(currentKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setValidationResult({
        valid: false,
        message: 'Please enter an API key to test.'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await verifyApiKey(apiKeyInput.trim());
      setValidationResult({
        valid: res.valid,
        message: res.message || (res.valid ? 'API Key is active and ready!' : res.error)
      });
    } catch (err) {
      setValidationResult({
        valid: false,
        message: err.message || 'Key validation failed. Please check the key.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    onSaveKey(apiKeyInput.trim());
    onClose();
  };

  const handleClear = () => {
    setApiKeyInput('');
    onSaveKey('');
    setValidationResult(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={20} className="icon" color="#7c3aed" />
            <span>Gemini API Key Settings</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '0.65rem' }}>
            Provide your Google Gemini API key to power document parsing, deep section analysis, and citation-backed Q&A.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
            <Shield size={14} />
            <span>Your key is stored locally in your browser and sent securely only with your requests.</span>
          </div>
        </div>

        {healthStatus?.gemini_api_key_configured && !currentKey && (
          <div className="alert alert-info" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem' }}>
              <strong>Server Key Detected:</strong> The backend has a default Gemini key configured in <code>.env</code>. You can still provide your own key below to override it.
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Google Gemini API Key</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter your Gemini API key (e.g. AIzaSy... or AQ...)"
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              setValidationResult(null);
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.8rem',
              color: 'var(--primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontWeight: 600
            }}
          >
            Get a free key from Google AI Studio <ExternalLink size={12} />
          </a>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleTestKey}
            disabled={isValidating || !apiKeyInput.trim()}
          >
            {isValidating ? (
              <>
                <Loader2 size={13} className="spin" />
                <span>Testing...</span>
              </>
            ) : (
              <span>Test Key</span>
            )}
          </button>
        </div>

        {validationResult && (
          <div
            className={`alert ${validationResult.valid ? 'alert-info' : 'alert-danger'}`}
            style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              borderColor: validationResult.valid ? 'var(--success-border)' : 'var(--danger-border)',
              background: validationResult.valid ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: validationResult.valid ? 'var(--success)' : '#991b1b'
            }}
          >
            {validationResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ fontSize: '0.84rem' }}>{validationResult.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          {currentKey && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginRight: 'auto', color: 'var(--danger)' }}
              onClick={handleClear}
            >
              Remove Saved Key
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
