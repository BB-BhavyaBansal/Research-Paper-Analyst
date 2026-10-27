import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Loader2,
  FileText,
  Sparkles,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AnalysisView from './components/AnalysisView';
import ChatView from './components/ChatView';
import WelcomeHero from './components/WelcomeHero';
import ApiKeyModal from './components/ApiKeyModal';

import {
  checkHealth,
  uploadPdfPaper,
  triggerAnalysis,
  fetchPaperHistory,
  fetchPaperDetails,
  deletePaper
} from './api';

export default function App() {
  // Global & API State
  const [healthStatus, setHealthStatus] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMetadata, setAnalysisMetadata] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisStep, setAnalysisStep] = useState('');

  // History State
  const [history, setHistory] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  // Refs
  const chatContainerRef = useRef(null);

  // Check backend health & load history on mount
  useEffect(() => {
    loadHealth();
    loadHistory();
  }, []);

  const loadHealth = async () => {
    const health = await checkHealth();
    setHealthStatus(health);
  };

  const loadHistory = async () => {
    const historyList = await fetchPaperHistory();
    setHistory(historyList);
  };

  const handleSaveApiKey = (newKey) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('gemini_api_key', newKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  // Handle PDF File Selection & Automatic Upload
  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a valid PDF research paper (.pdf).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25 MB limit. Please select a smaller paper.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setIsUploading(true);

    try {
      const uploadRes = await uploadPdfPaper(file);
      setFileMetadata(uploadRes);
      setActiveFileId(uploadRes.file_id);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload and parse PDF.');
      setSelectedFile(null);
      setFileMetadata(null);
      setActiveFileId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileMetadata(null);
    setAnalysis(null);
    setAnalysisError(null);
    setUploadError(null);
    setActiveFileId(null);
  };

  // Execute Gemini AI Analysis
  const handleAnalyze = async () => {
    if (!fileMetadata?.file_id) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('Ingesting extracted PDF text and metadata...');

    const timer1 = setTimeout(() => {
      setAnalysisStep('Querying Gemini model for 7 structured dimensions...');
    }, 2500);

    const timer2 = setTimeout(() => {
      setAnalysisStep('Synthesizing methodology, findings, and limitations...');
    }, 7000);

    try {
      const res = await triggerAnalysis(fileMetadata.file_id, apiKey || null);
      setAnalysis(res.analysis);
      setAnalysisMetadata(res.metadata);
      setActiveFileId(res.file_id);

      // Refresh history list
      loadHistory();

      // Trigger celebratory micro-animation
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#a855f7', '#c084fc', '#38bdf8']
        });
      } catch {}
    } catch (err) {
      setAnalysisError(err.message || 'Analysis generation failed. Please verify your Gemini API key.');
      if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('api key'))) {
        setIsKeyModalOpen(true);
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Select Item from History
  const handleSelectHistoryItem = async (fileId) => {
    if (fileId === activeFileId && analysis) return;

    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisStep('Retrieving cached analysis from session...');

    try {
      const paperData = await fetchPaperDetails(fileId);
      setActiveFileId(paperData.file_id);
      setFileMetadata({
        file_id: paperData.file_id,
        filename: paperData.filename,
        title: paperData.title,
        total_pages: paperData.total_pages
      });
      setSelectedFile({ name: paperData.filename, size: 0 });
      setAnalysis(paperData.analysis);
      setAnalysisMetadata({
        filename: paperData.filename,
        total_pages: paperData.total_pages,
        analyzed_at: paperData.uploaded_at
      });
    } catch (err) {
      setAnalysisError('Could not load cached paper: ' + err.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Delete Paper from History
  const handleDeleteHistoryItem = async (fileId) => {
    try {
      await deletePaper(fileId);
      setHistory((prev) => prev.filter((h) => h.file_id !== fileId));
      if (activeFileId === fileId) {
        handleRemoveFile();
      }
    } catch (err) {
      console.error('Failed to delete paper:', err);
    }
  };

  const handleResetToHome = () => {
    handleRemoveFile();
  };

  const handleScrollToChat = () => {
    chatContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app-layout">
      {/* Top Navigation Bar */}
      <Navbar
        healthStatus={healthStatus}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onReset={handleResetToHome}
      />

      {/* Main Dashboard Layout */}
      <main className="dashboard-container">
        {/* Left Control Sidebar */}
        <Sidebar
          selectedFile={selectedFile}
          fileMetadata={fileMetadata}
          isUploading={isUploading}
          isAnalyzing={isAnalyzing}
          uploadError={uploadError}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onAnalyze={handleAnalyze}
          history={history}
          activeFileId={activeFileId}
          onSelectHistoryItem={handleSelectHistoryItem}
          onDeleteHistoryItem={handleDeleteHistoryItem}
        />

        {/* Right Main Content Panel */}
        <div className="main-content">
          {/* Analysis Error Alert */}
          {analysisError && (
            <div className="alert alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <strong>Analysis Failed:</strong> {analysisError}
                <div style={{ marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsKeyModalOpen(true)}
                    style={{ background: '#ffffff' }}
                  >
                    Configure Gemini API Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State during AI Analysis */}
          {isAnalyzing && (
            <div className="card loading-indicator">
              <div className="spinner-glow" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Analyzing Academic Paper
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px' }}>
                Extracting core problem, objectives, contributions, mathematical models, experimental findings, and future scope...
              </p>
              {analysisStep && (
                <div className="loading-step-pill">
                  ⚡ {analysisStep}
                </div>
              )}
            </div>
          )}

          {/* Analysis View & Chat when analysis is ready */}
          {!isAnalyzing && analysis && (
            <>
              <AnalysisView
                analysis={analysis}
                metadata={analysisMetadata || fileMetadata}
                fileId={activeFileId}
                onScrollToChat={handleScrollToChat}
              />

              <ChatView
                fileId={activeFileId}
                paperTitle={analysis?.paper_title || fileMetadata?.title}
                customApiKey={apiKey || null}
                chatContainerRef={chatContainerRef}
              />
            </>
          )}

          {/* Welcome Hero when no paper has been analyzed yet */}
          {!isAnalyzing && !analysis && (
            <WelcomeHero
              onTriggerUpload={() => {
                const dropzone = document.querySelector('.dropzone');
                if (dropzone) {
                  dropzone.scrollIntoView({ behavior: 'smooth' });
                  dropzone.classList.add('active');
                  setTimeout(() => dropzone.classList.remove('active'), 1200);
                }
              }}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          Research Paper Analyst • Powered by Google Gemini AI & FastAPI • Academic PDF Decomposition & Verifiable Citations
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentKey={apiKey}
        onSaveKey={handleSaveApiKey}
        healthStatus={healthStatus}
      />
    </div>
  );
}
