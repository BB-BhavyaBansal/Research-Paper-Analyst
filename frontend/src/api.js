/**
 * Research Paper Analyst API Client
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      gemini_api_key_configured: false,
      error: err.message
    };
  }
}

export async function verifyApiKey(apiKey) {
  const res = await fetch(`${API_BASE_URL}/api/settings/verify-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Key validation failed');
  }
  return await res.json();
}

export async function uploadPdfPaper(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload PDF paper');
  }
  return await res.json();
}

export async function triggerAnalysis(fileId, customApiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (customApiKey) {
    headers['X-Custom-API-Key'] = customApiKey;
  }

  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file_id: fileId,
      custom_api_key: customApiKey || undefined
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Analysis generation failed.');
  }
  return await res.json();
}

export async function askPaperQuestion(fileId, question, history = [], customApiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (customApiKey) {
    headers['X-Custom-API-Key'] = customApiKey;
  }

  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file_id: fileId,
      question,
      history,
      custom_api_key: customApiKey || undefined
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to answer question.');
  }
  return await res.json();
}

export async function fetchPaperHistory() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPaperDetails(fileId) {
  const res = await fetch(`${API_BASE_URL}/api/paper/${fileId}`);
  if (!res.ok) throw new Error('Paper not found.');
  return await res.json();
}

export async function deletePaper(fileId) {
  const res = await fetch(`${API_BASE_URL}/api/paper/${fileId}`, {
    method: 'DELETE'
  });
  return res.ok;
}

export function getDocxDownloadUrl(fileId) {
  return `${API_BASE_URL}/api/export/docx/${fileId}`;
}

export function getPrintableViewUrl(fileId) {
  return `${API_BASE_URL}/api/export/pdf-html/${fileId}`;
}
