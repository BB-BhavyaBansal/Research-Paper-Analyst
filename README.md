# Research Paper Analyst 📄🔬

An AI-powered academic paper analysis and interactive exploration platform. Upload any research paper in PDF format to receive instant, structured multi-section insights and have an interactive, page-cited Q&A session grounded strictly in the paper's contents.

---

## ✨ Features

- **Automated 7-Section Analysis**:
  1. Executive Summary & Core Domain
  2. Research Problem, Objectives & Motivation
  3. Key Contributions & Novel Findings
  4. Methodology & Architecture
  5. Quantitative Results, Benchmarks & Metrics
  6. Limitations & Scope Constraints
  7. Future Research Directions
- **Grounded Interactive Q&A**: Ask follow-up questions; answers cite exact page numbers (e.g. `[Page 4]`) and decline to hallucinate unmentioned facts.
- **Export Capabilities**:
  - **Word Document (.docx)**: Formatted, styled academic report ready for editing.
  - **Printable HTML/PDF**: Clean layout formatted for browser print / Save as PDF.
- **Flexible API Key Configuration**:
  - Load your Gemini API key from `backend/.env` automatically.
  - Or enter/switch keys in real-time using the in-app **API Key** settings modal (stored only in browser memory/localStorage).
- **Graceful Error Handling & Fallbacks**: Automatic retry logic for temporary API traffic surges and informative error diagnosis for expired keys, quota limits, or network timeouts.

---

## 🛠️ Prerequisites

Before running the application on your computer, ensure you have:

1. **Python 3.10 or higher**: [Download Python](https://www.python.org/downloads/) (Make sure to check *"Add Python to PATH"* during Windows installation)
2. **Node.js 18 or higher**: [Download Node.js](https://nodejs.org/) (LTS recommended)
3. **Google Gemini API Key**: Free to generate at [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🚀 Quick Start Guide

Follow these simple steps to run both the backend and frontend on your laptop.

### Step 1: Clone or Extract the Repository

```bash
git clone <repository-url>
cd "Yatin's Prj"
```

---

### Step 2: Configure and Start the Backend

1. Open a new terminal / PowerShell window and navigate into the `backend` folder:
   ```powershell
   cd backend
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

4. Create your local `.env` file from the provided example:
   ```powershell
   copy .env.example .env
   ```

5. Open `.env` in a text editor (Notepad, VS Code, etc.) and paste your Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   PORT=8000
   ```
   > 🔒 **Security Notice**: Never commit `.env` to GitHub. The `.gitignore` file is already configured to keep your credentials private.

6. Launch the backend FastAPI server:
   ```powershell
   python main.py
   ```
   *The backend will start and listen at **http://localhost:8000**.*  
   *Interactive API documentation is accessible at **http://localhost:8000/docs**.*

---

### Step 3: Install and Start the Frontend

1. Open a **second** terminal window and navigate into the `frontend` folder:
   ```powershell
   cd frontend
   ```

2. Install Node dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

4. Open your web browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🧭 How to Use

1. **Verify API Connection**:
   - In the top navigation bar, click the **Gemini Key** button.
   - If configured via `backend/.env`, you will see a badge stating server key detected.
   - You can also paste your key directly and click **Test Key** to verify connectivity with Google Gemini.
2. **Upload a Research Paper**:
   - Drag and drop or browse to select any research paper in `.pdf` format (up to 25MB).
   - Click **Analyze Research Paper** to initiate AI analysis.
3. **Review Structured Insights**:
   - Explore tabs for Summary, Objectives, Contributions, Methodology, Results, Limitations, and Future Directions.
4. **Ask Questions**:
   - Use the **Ask Questions** tab to query specific formulas, conclusions, or nuances. Every answer cites corresponding page numbers.
5. **Export Analysis**:
   - Click **Export .DOCX** to download an editable Microsoft Word document.
   - Click **Print / PDF** to view a printable report.

---

## 📂 Project Architecture

```
├── backend/
│   ├── main.py              # FastAPI application endpoints and route handlers
│   ├── analyzer.py          # Google Gemini API integration, prompts, retry & fallback logic
│   ├── pdf_parser.py        # PDF text extraction and page marker indexing (pypdf)
│   ├── export_service.py    # Formatted DOCX and printable HTML report generators
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Template for environment variables
│   └── .env                 # Local secrets file (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI components (AnalysisView, ChatView, ApiKeyModal, etc.)
│   │   ├── api.js           # Frontend HTTP API client communicating with backend
│   │   ├── App.jsx          # Main application container and view router
│   │   ├── index.css        # Responsive styling and design system
│   │   └── main.jsx         # React application entrypoint
│   ├── package.json         # Frontend dependencies and build scripts
│   └── vite.config.js       # Vite build configuration
├── .gitignore               # Excludes secrets, node_modules, caches, and build artifacts
├── .env.example             # Root environment template
└── README.md                # Project documentation
```

---

## 🔍 Troubleshooting FAQ

- **Backend says `Port 8000 already in use`**:
  - Change `PORT=8001` in `backend/.env` and specify port 8001 when running uvicorn.
  - Or terminate the existing process occupying port 8000:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
    ```
- **"Invalid Gemini API Key" error**:
  - Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a fresh API key.
  - Make sure there are no accidental spaces or quotation marks around the key in `backend/.env`.
- **"Quota exhausted" (429) error**:
  - The free tier has generous rate limits (15 requests per minute). Wait 60 seconds and retry.
- **Scanned PDF warning**:
  - If a PDF consists purely of scanned images without embedded text layers, OCR may be needed. Use digital-native PDFs with searchable text for best results.

---

## 📜 License & Acknowledgments

- Built for academic demonstration and research assistance.
- Powered by Google Gemini and FastAPI.
# Research-Paper-Analyst
An AI-powered research paper analysis platform that allows users to upload PDF research papers, generate summaries, extract key findings, understand research methodologies, identify limitations, and ask questions about the paper using Google's Gemini API.
