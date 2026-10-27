import React from 'react';
import {
  Sparkles,
  Layers,
  MessageSquare,
  FileDown,
  ShieldCheck,
  UploadCloud,
  ArrowRight,
  BookOpenCheck
} from 'lucide-react';

export default function WelcomeHero({ onTriggerUpload }) {
  return (
    <div className="welcome-card">
      <div className="welcome-badge">
        <Sparkles size={14} />
        <span>Gemini AI Academic Assistant</span>
      </div>

      <h2 className="welcome-title">
        Deep Academic Paper Analysis in Seconds
      </h2>

      <p className="welcome-desc">
        Upload any academic paper, preprint, or journal article in PDF format.
        Our AI parser deconstructs dense academic prose into 7 structured research dimensions
        and lets you interrogate findings with ground-truth page citations.
      </p>

      <div style={{ marginBottom: '1.75rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onTriggerUpload}
          style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem' }}
        >
          <UploadCloud size={18} />
          <span>Upload PDF Paper to Begin</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="features-grid">
        <div className="feature-pill">
          <div className="feat-icon">
            <Layers size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              7 Standardized Sections
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Summary, Objectives, Contributions, Methodology, Findings, Limitations, and Future Directions.
            </p>
          </div>
        </div>

        <div className="feature-pill">
          <div className="feat-icon">
            <MessageSquare size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              Grounded Citations
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Ask questions and receive verifiable responses tagged with original page references.
            </p>
          </div>
        </div>

        <div className="feature-pill">
          <div className="feat-icon">
            <FileDown size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              Docx & PDF Export
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Export formatted Word (.docx) executive briefs or print clean report summaries.
            </p>
          </div>
        </div>

        <div className="feature-pill">
          <div className="feat-icon">
            <ShieldCheck size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              Custom API Key Ready
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Use your personal Google Gemini API key securely from your browser without cloud storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
