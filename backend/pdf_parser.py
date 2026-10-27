import io
import re
from typing import Dict, List, Any, Optional
from pypdf import PdfReader


def clean_text(text: str) -> str:
    """Cleans extracted text by normalizing whitespace while preserving paragraphs."""
    if not text:
        return ""
    # Replace null bytes
    text = text.replace("\x00", "")
    # Normalize multiple line breaks
    text = re.sub(r"\r\n|\r", "\n", text)
    # Replace excessive spaces
    text = re.sub(r"[ \t]+", " ", text)
    # Normalize 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_data(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Extracts text, page count, metadata, and per-page content from a PDF byte stream.
    """
    stream = io.BytesIO(file_bytes)
    reader = PdfReader(stream)
    
    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError("The uploaded PDF has no readable pages.")

    pages_data: List[Dict[str, Any]] = []
    full_text_with_pages: List[str] = []
    plain_full_text: List[str] = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        
        pages_data.append({
            "page_number": page_num,
            "text": cleaned,
            "char_count": len(cleaned)
        })
        
        full_text_with_pages.append(f"--- [PAGE {page_num}] ---\n{cleaned}\n")
        if cleaned:
            plain_full_text.append(cleaned)

    # Combine text
    combined_annotated_text = "\n".join(full_text_with_pages)
    combined_plain_text = "\n\n".join(plain_full_text)

    # Check if text is extractable (e.g. scanned image PDF vs digital PDF)
    total_chars = sum(p["char_count"] for p in pages_data)
    if total_chars < 50:
        is_scanned = True
    else:
        is_scanned = False

    # Extract metadata if available
    metadata = {}
    if reader.metadata:
        try:
            metadata = {
                "title": reader.metadata.title or "",
                "author": reader.metadata.author or "",
                "subject": reader.metadata.subject or "",
                "creator": reader.metadata.creator or ""
            }
        except Exception:
            metadata = {}

    # Extract potential paper title from first page if metadata title is empty
    extracted_title = metadata.get("title")
    if not extracted_title and len(pages_data) > 0:
        first_lines = [l.strip() for l in pages_data[0]["text"].split("\n") if len(l.strip()) > 3]
        if first_lines:
            extracted_title = first_lines[0][:120]
    if not extracted_title:
        extracted_title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")

    return {
        "filename": filename,
        "title": extracted_title,
        "total_pages": total_pages,
        "total_characters": total_chars,
        "is_scanned": is_scanned,
        "metadata": metadata,
        "pages": pages_data,
        "annotated_text": combined_annotated_text,
        "plain_text": combined_plain_text
    }
