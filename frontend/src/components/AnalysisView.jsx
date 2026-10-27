import React, { useState } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  BookOpen,
  Target,
  Sparkles,
  Cpu,
  BarChart3,
  AlertTriangle,
  Compass,
  MessageSquare,
  Bookmark,
  Share2
} from 'lucide-react';
import { getDocxDownloadUrl, getPrintableViewUrl } from '../api';

export default function AnalysisView({
  analysis,
  metadata,
  fileId,
  onScrollToChat
}) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  if (!analysis) return null;

  const handleCopySummary = () => {
    if (analysis.paper_summary) {
      navigator.clipboard.writeText(analysis.paper_summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const handleOpenPrintable = () => {
    const url = getPrintableViewUrl(fileId);
    window.open(url, '_blank');
  };

  const rpo = analysis.research_problem_and_objectives || {};
  const meth = analysis.research_methodology || {};
  const res = analysis.results_and_findings || {};
  const contributions = analysis.key_contributions || [];
  const limitations = analysis.limitations || [];
  const futureDirections = analysis.future_research_directions || [];

  return (
    <div className="analysis-container">
      {/* Paper Header Card */}
      <div className="paper-header-card">
        <div className="paper-title-row">
          <h2 className="paper-title">
            {analysis.paper_title || metadata?.title || 'Academic Research Analysis'}
          </h2>
        </div>

        {/* Metadata Pills */}
        <div className="paper-meta-pills">
          {analysis.core_domain && (
            <span className="meta-pill domain">
              <Bookmark size={13} />
              {analysis.core_domain}
            </span>
          )}
          {analysis.authors && analysis.authors.length > 0 && (
            <span className="meta-pill authors">
              👤 {analysis.authors.slice(0, 3).join(', ')}
              {analysis.authors.length > 3 && ` +${analysis.authors.length - 3} more`}
            </span>
          )}
          {metadata?.total_pages && (
            <span className="meta-pill">
              📄 {metadata.total_pages} Pages
            </span>
          )}
          {analysis.publication_info && analysis.publication_info !== 'Not stated in paper' && (
            <span className="meta-pill">
              🏛️ {analysis.publication_info}
            </span>
          )}
          {metadata?.model_used && (
            <span className="meta-pill" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              ⚡ Model: {metadata.model_used}
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="action-toolbar">
          <div className="action-group">
            {/* Word Docx Download */}
            <a
              href={getDocxDownloadUrl(fileId)}
              className="btn btn-primary btn-sm"
              download
            >
              <FileDown size={15} />
              Download Word (.docx)
            </a>

            {/* Print / PDF view */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleOpenPrintable}
            >
              <Printer size={15} />
              Print / Save PDF
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopySummary}
            >
              {copiedSummary ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copiedSummary ? 'Copied!' : 'Copy Summary'}
            </button>
          </div>

          <div className="action-group">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onScrollToChat}
            >
              <MessageSquare size={14} />
              Ask Questions
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="section-nav-tabs" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        {[
          { id: 'all', label: 'All 7 Sections' },
          { id: 'summary', label: '1. Summary' },
          { id: 'problem', label: '2. Problem & Objectives' },
          { id: 'contributions', label: '3. Key Contributions' },
          { id: 'methodology', label: '4. Methodology' },
          { id: 'results', label: '5. Results & Findings' },
          { id: 'limitations', label: '6. Limitations' },
          { id: 'future', label: '7. Future Directions' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sections List */}
      <div className="analysis-sections">
        {/* 1. Paper Summary */}
        {(activeTab === 'all' || activeTab === 'summary') && (
          <section className="section-card" id="section-1">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">1</span>
                <h3>Paper Summary</h3>
              </div>
              <BookOpen size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              <p style={{ whiteSpace: 'pre-line' }}>
                {analysis.paper_summary || 'No summary found in paper.'}
              </p>
            </div>
          </section>
        )}

        {/* 2. Research Problem and Objectives */}
        {(activeTab === 'all' || activeTab === 'problem') && (
          <section className="section-card" id="section-2">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">2</span>
                <h3>Research Problem and Objectives</h3>
              </div>
              <Target size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              {rpo.problem_statement && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Core Problem Statement:
                  </strong>
                  <p>{rpo.problem_statement}</p>
                </div>
              )}

              {rpo.motivation && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Motivation:
                  </strong>
                  <p>{rpo.motivation}</p>
                </div>
              )}

              {rpo.objectives && rpo.objectives.length > 0 && (
                <div>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.45rem' }}>
                    Key Research Objectives:
                  </strong>
                  <ul className="styled-list">
                    {rpo.objectives.map((obj, i) => (
                      <li key={i}>
                        <span className="bullet-icon">✦</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. Key Contributions and Important Points */}
        {(activeTab === 'all' || activeTab === 'contributions') && (
          <section className="section-card" id="section-3">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">3</span>
                <h3>Key Contributions and Important Points</h3>
              </div>
              <Sparkles size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              {contributions.length > 0 ? (
                <div className="contributions-grid">
                  {contributions.map((c, i) => (
                    <div key={i} className="contrib-card">
                      <h4>
                        <span>{typeof c === 'object' ? c.title : `Contribution ${i + 1}`}</span>
                        {typeof c === 'object' && c.page_reference && (
                          <span className="page-ref-tag">{c.page_reference}</span>
                        )}
                      </h4>
                      <p>{typeof c === 'object' ? c.description : c}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Information not explicitly stated in the paper.</p>
              )}
            </div>
          </section>
        )}

        {/* 4. Research Methodology */}
        {(activeTab === 'all' || activeTab === 'methodology') && (
          <section className="section-card" id="section-4">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">4</span>
                <h3>Research Methodology</h3>
              </div>
              <Cpu size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              {meth.approach_overview && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Approach Overview:
                  </strong>
                  <p>{meth.approach_overview}</p>
                </div>
              )}

              {meth.architectural_details && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Architectural & Experimental Design:
                  </strong>
                  <p>{meth.architectural_details}</p>
                </div>
              )}

              {meth.baseline_comparisons && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Baseline Comparisons & Benchmarks:
                  </strong>
                  <p>{meth.baseline_comparisons}</p>
                </div>
              )}

              {meth.implementation_details && (
                <div>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Implementation & Reproducibility Details:
                  </strong>
                  <p>{meth.implementation_details}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. Results and Findings */}
        {(activeTab === 'all' || activeTab === 'results') && (
          <section className="section-card" id="section-5">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">5</span>
                <h3>Results and Findings</h3>
              </div>
              <BarChart3 size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              {res.summary && (
                <div style={{ marginBottom: '1rem' }}>
                  <p>{res.summary}</p>
                </div>
              )}

              {res.metrics_and_benchmarks && res.metrics_and_benchmarks.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.45rem' }}>
                    Reported Metrics & Benchmarks:
                  </strong>
                  <ul className="styled-list">
                    {res.metrics_and_benchmarks.map((m, i) => (
                      <li key={i}>
                        <span className="bullet-icon">📊</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {res.significance && (
                <div>
                  <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.25rem' }}>
                    Significance & Validation:
                  </strong>
                  <p>{res.significance}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Limitations */}
        {(activeTab === 'all' || activeTab === 'limitations') && (
          <section className="section-card" id="section-6">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">6</span>
                <h3>Limitations</h3>
              </div>
              <AlertTriangle size={18} color="#f59e0b" />
            </div>
            <div className="section-body">
              {limitations.length > 0 ? (
                <div className="limitations-box">
                  <ul className="styled-list">
                    {limitations.map((lim, i) => (
                      <li key={i}>
                        <span className="bullet-icon">⚠️</span>
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Information not explicitly stated in the paper.</p>
              )}
            </div>
          </section>
        )}

        {/* 7. Future Research Directions */}
        {(activeTab === 'all' || activeTab === 'future') && (
          <section className="section-card" id="section-7">
            <div className="section-header">
              <div className="section-title">
                <span className="section-badge-num">7</span>
                <h3>Future Research Directions</h3>
              </div>
              <Compass size={18} color="#7c3aed" />
            </div>
            <div className="section-body">
              {futureDirections.length > 0 ? (
                <div className="future-box">
                  <ul className="styled-list">
                    {futureDirections.map((fut, i) => (
                      <li key={i}>
                        <span className="bullet-icon">🚀</span>
                        <span>{fut}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Information not explicitly stated in the paper.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
