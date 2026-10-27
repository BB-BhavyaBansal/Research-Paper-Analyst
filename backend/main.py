import os
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from pydantic import BaseModel, Field

from pdf_parser import extract_pdf_data
from analyzer import (
    analyze_paper_content,
    answer_paper_question,
    get_genai_client,
    _generate_with_retry,
    PREFERRED_MODELS,
    format_gemini_error,
    DEFAULT_GEMINI_KEY
)
from export_service import generate_docx_report, generate_printable_html

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Research Paper Analyst API",
    description="Backend API for AI-powered research paper analysis and interactive Q&A",
    version="1.0.0"
)

# Enable CORS for local dev and production hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (keyed by file_id)
# In production, this can also be backed by Redis or SQLite
PAPERS_STORE: Dict[str, Dict[str, Any]] = {}
ANALYSIS_HISTORY: List[Dict[str, Any]] = []

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class AnalyzeRequest(BaseModel):
    file_id: str
    custom_api_key: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    file_id: str
    question: str
    history: List[ChatMessage] = Field(default_factory=list)
    custom_api_key: Optional[str] = None


class VerifyKeyRequest(BaseModel):
    api_key: str


@app.get("/api/health")
def health_check():
    """Checks backend status and whether Gemini API Key is configured."""
    has_key = bool(os.getenv("GEMINI_API_KEY", "").strip() or DEFAULT_GEMINI_KEY)
    return {
        "status": "online",
        "service": "Research Paper Analyst API",
        "gemini_api_key_configured": has_key,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/settings/verify-key")
def verify_api_key(payload: VerifyKeyRequest):
    """Verifies if a provided Gemini API Key is valid by issuing a test call."""
    key = payload.api_key.strip()
    if not key:
        key = os.getenv("GEMINI_API_KEY", "").strip() or DEFAULT_GEMINI_KEY
    if not key:
        return {
            "valid": False,
            "error_type": "blank_key",
            "message": "API Key cannot be blank. Please enter your Gemini API key."
        }

    last_err = None
    for model_name in PREFERRED_MODELS:
        try:
            client = get_genai_client(key)
            response = _generate_with_retry(
                client,
                model_name,
                contents="Hello! Confirm connection in 3 words.",
            )
            return {
                "valid": True,
                "message": f"Gemini API Key is valid and active (connected via {model_name})!",
                "model": model_name,
                "sample_response": response.text.strip() if response.text else "Connection confirmed."
            }
        except Exception as e:
            last_err = e
            logger.warning(f"Key verify attempt failed with model {model_name}: {str(e)}")
            err_info = format_gemini_error(e)
            # If the key itself is invalid or project quota is exhausted, fail fast
            if err_info["error_type"] in ("invalid_key", "quota_exhausted"):
                return {
                    "valid": False,
                    "error_type": err_info["error_type"],
                    "error": err_info["details"],
                    "message": err_info["message"]
                }
            # Otherwise, try next fallback model (e.g., if model is overloaded or 404)
            continue

    err_info = format_gemini_error(last_err) if last_err else {
        "error_type": "unknown",
        "message": "Key verification failed. Please check your network and API key.",
        "details": "Unknown error"
    }
    return {
        "valid": False,
        "error_type": err_info["error_type"],
        "error": err_info["details"],
        "message": err_info["message"]
    }


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Validates and extracts content from an uploaded PDF research paper.
    """
    # 1. Validate file extension
    filename = file.filename or "paper.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a research paper in PDF format (.pdf)."
        )

    # 2. Read bytes & check size limit
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 25MB (Current: {len(file_bytes) / (1024*1024):.1f}MB)."
        )

    # 3. Extract PDF text & metadata
    try:
        pdf_data = extract_pdf_data(file_bytes, filename)
    except Exception as e:
        logger.error(f"Error parsing PDF: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not read PDF contents: {str(e)}. Please ensure the PDF is not password protected or corrupted."
        )

    # 4. Generate ID and save in store
    file_id = str(uuid.uuid4())
    paper_record = {
        "file_id": file_id,
        "filename": filename,
        "title": pdf_data["title"],
        "total_pages": pdf_data["total_pages"],
        "total_characters": pdf_data["total_characters"],
        "is_scanned": pdf_data["is_scanned"],
        "metadata": pdf_data["metadata"],
        "annotated_text": pdf_data["annotated_text"],
        "plain_text": pdf_data["plain_text"][:5000],  # Preview
        "uploaded_at": datetime.utcnow().isoformat(),
        "analysis": None
    }
    PAPERS_STORE[file_id] = paper_record

    return {
        "file_id": file_id,
        "filename": filename,
        "title": pdf_data["title"],
        "total_pages": pdf_data["total_pages"],
        "total_characters": pdf_data["total_characters"],
        "file_size_bytes": len(file_bytes),
        "is_scanned": pdf_data["is_scanned"],
        "message": "File uploaded and parsed successfully."
    }


@app.post("/api/analyze")
def analyze_paper(payload: AnalyzeRequest, x_custom_api_key: Optional[str] = Header(None)):
    """
    Executes AI analysis using Gemini to extract the 7 core sections.
    """
    file_id = payload.file_id
    if file_id not in PAPERS_STORE:
        raise HTTPException(status_code=404, detail="Paper not found. Please upload the PDF again.")

    paper = PAPERS_STORE[file_id]
    custom_key = payload.custom_api_key or x_custom_api_key

    # Check for scanned warning
    if paper.get("is_scanned"):
        logger.warning(f"File {paper['filename']} appears to be scanned with few extracted characters.")

    try:
        analysis_result = analyze_paper_content(
            annotated_text=paper["annotated_text"],
            paper_metadata={
                "filename": paper["filename"],
                "total_pages": paper["total_pages"],
                "title": paper["title"]
            },
            custom_api_key=custom_key
        )
        
        # Cache analysis
        paper["analysis"] = analysis_result
        paper["analyzed_at"] = datetime.utcnow().isoformat()

        # Update or add to history
        history_item = {
            "file_id": file_id,
            "filename": paper["filename"],
            "title": analysis_result.get("paper_title") or paper["title"],
            "core_domain": analysis_result.get("core_domain", "Research Paper"),
            "total_pages": paper["total_pages"],
            "analyzed_at": paper["analyzed_at"]
        }
        
        # Deduplicate history
        existing_idx = next((i for i, h in enumerate(ANALYSIS_HISTORY) if h["file_id"] == file_id), None)
        if existing_idx is not None:
            ANALYSIS_HISTORY[existing_idx] = history_item
        else:
            ANALYSIS_HISTORY.insert(0, history_item)

        return {
            "file_id": file_id,
            "analysis": analysis_result,
            "metadata": {
                "filename": paper["filename"],
                "total_pages": paper["total_pages"],
                "analyzed_at": paper["analyzed_at"],
                "model_used": analysis_result.get("analyzed_model", "Gemini")
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/api/chat")
def chat_with_paper(payload: ChatRequest, x_custom_api_key: Optional[str] = Header(None)):
    """
    Answers questions strictly based on the uploaded paper, providing page citations.
    """
    file_id = payload.file_id
    if file_id not in PAPERS_STORE:
        raise HTTPException(status_code=404, detail="Paper not found. Please upload the PDF again.")

    paper = PAPERS_STORE[file_id]
    custom_key = payload.custom_api_key or x_custom_api_key
    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]

    try:
        answer_result = answer_paper_question(
            annotated_text=paper["annotated_text"],
            question=payload.question,
            chat_history=history_dicts,
            custom_api_key=custom_key
        )
        return answer_result
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")


@app.get("/api/paper/{file_id}")
def get_paper(file_id: str):
    """Retrieves cached analysis and metadata for a given file_id."""
    if file_id not in PAPERS_STORE:
        raise HTTPException(status_code=404, detail="Paper not found.")
    p = PAPERS_STORE[file_id]
    return {
        "file_id": file_id,
        "filename": p["filename"],
        "title": p["title"],
        "total_pages": p["total_pages"],
        "uploaded_at": p["uploaded_at"],
        "has_analysis": p["analysis"] is not None,
        "analysis": p["analysis"]
    }


@app.get("/api/history")
def get_history():
    """Returns list of previously analyzed papers."""
    return ANALYSIS_HISTORY


@app.delete("/api/paper/{file_id}")
def delete_paper(file_id: str):
    """Removes a paper from current session and history."""
    if file_id in PAPERS_STORE:
        del PAPERS_STORE[file_id]
    global ANALYSIS_HISTORY
    ANALYSIS_HISTORY = [h for h in ANALYSIS_HISTORY if h["file_id"] != file_id]
    return {"message": "Paper removed successfully."}


@app.get("/api/export/docx/{file_id}")
def export_docx(file_id: str):
    """Exports the paper analysis as a formatted Microsoft Word document (.docx)."""
    if file_id not in PAPERS_STORE:
        raise HTTPException(status_code=404, detail="Paper not found.")
    paper = PAPERS_STORE[file_id]
    if not paper.get("analysis"):
        raise HTTPException(status_code=400, detail="Paper has not been analyzed yet.")

    bio = generate_docx_report(paper["analysis"], paper)
    safe_filename = "".join(c for c in paper["title"] if c.isalnum() or c in (" ", "-", "_")).rstrip()
    if not safe_filename:
        safe_filename = "Research_Paper_Analysis"
    download_name = f"{safe_filename[:40]}_Analysis.docx"

    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'}
    )


@app.get("/api/export/pdf-html/{file_id}")
def export_pdf_html(file_id: str):
    """Exports printable HTML formatted for direct PDF saving/printing."""
    if file_id not in PAPERS_STORE:
        raise HTTPException(status_code=404, detail="Paper not found.")
    paper = PAPERS_STORE[file_id]
    if not paper.get("analysis"):
        raise HTTPException(status_code=400, detail="Paper has not been analyzed yet.")

    html_content = generate_printable_html(paper["analysis"], paper)
    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
