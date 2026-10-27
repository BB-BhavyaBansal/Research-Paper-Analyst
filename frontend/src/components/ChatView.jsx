import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  BookmarkCheck,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askPaperQuestion } from '../api';

const SUGGESTED_QUESTIONS = [
  "What is the primary novel contribution?",
  "What datasets and benchmarks were evaluated?",
  "What baseline models was this compared against?",
  "What limitations or assumptions are discussed?",
  "Explain the core mathematical formula or methodology."
];

export default function ChatView({
  fileId,
  paperTitle,
  customApiKey,
  chatContainerRef
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I have thoroughly ingested **${paperTitle || 'this research paper'}**. Ask me anything about its methodology, findings, datasets, or theoretical claims. Every answer will be grounded directly in the text with page citations.`,
      citations: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  const handleSend = async (questionToSend) => {
    const question = (questionToSend || inputText).trim();
    if (!question || isAsking) return;

    setInputText('');
    setErrorMessage(null);

    // Append user message
    const updatedHistory = [
      ...messages,
      { role: 'user', content: question, citations: [] }
    ];
    setMessages(updatedHistory);
    setIsAsking(true);

    try {
      // Filter out intro assistant message for backend context if desired, or send full history
      const formattedHistory = updatedHistory
        .filter((_, idx) => idx > 0)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      const res = await askPaperQuestion(
        fileId,
        question,
        formattedHistory,
        customApiKey
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer || 'No answer could be retrieved.',
          citations: res.page_citations || []
        }
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to get answer. Please verify API key.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Could not complete answer: ${err.message || 'Check your Gemini API key.'}`,
          isError: true,
          citations: []
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat reset. Ask any question about **${paperTitle || 'this research paper'}**.`,
        citations: []
      }
    ]);
    setErrorMessage(null);
  };

  return (
    <div className="chat-container-card" ref={chatContainerRef} id="chat-section">
      <div className="chat-header">
        <div>
          <h3>
            <MessageSquare size={19} color="#7c3aed" />
            <span>Interactive Q&A & Citations</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Direct queries answered with verifiable page references
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleResetChat}
          title="Reset conversation"
        >
          <RotateCcw size={13} />
          <span>Reset Chat</span>
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="chat-suggested-pills">
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
          <Sparkles size={12} color="#7c3aed" /> Suggested:
        </span>
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            className="suggested-pill"
            onClick={() => handleSend(q)}
            disabled={isAsking}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`chat-bubble-wrapper ${isUser ? 'user' : 'ai'}`}
            >
              <div className={`chat-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
                {isUser ? (
                  <p>{msg.content}</p>
                ) : (
                  <div>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.citations && msg.citations.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          flexWrap: 'wrap',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <BookmarkCheck size={14} color="#7c3aed" />
                        <span>Source Pages:</span>
                        {msg.citations.map((page, pIdx) => (
                          <span key={pIdx} className="citation-badge">
                            {page}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isAsking && (
          <div className="chat-bubble-wrapper ai">
            <div className="chat-avatar ai-avatar">
              <Bot size={16} />
            </div>
            <div className="chat-bubble ai-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={16} className="spin" color="#7c3aed" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Consulting paper content and locating citations...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question about methodology, results, equations, or claims..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAsking}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={isAsking || !inputText.trim()}
          style={{ padding: '0.75rem 1.25rem' }}
        >
          {isAsking ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
