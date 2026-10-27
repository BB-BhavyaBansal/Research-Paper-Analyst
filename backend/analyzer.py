import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError

logger = logging.getLogger(__name__)

MAX_RETRIES = 3        # Max retries on 503 overload
RETRY_DELAY = 4        # Seconds between retries


def _generate_with_retry(client, model_name: str, **kwargs):
    """
    Calls client.models.generate_content with automatic retry on 503 overload.
    Raises the last error if all retries are exhausted.
    """
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return client.models.generate_content(model=model_name, **kwargs)
        except APIError as e:
            err_str = str(e)
            is_overload = "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower()
            if is_overload and attempt < MAX_RETRIES:
                wait = RETRY_DELAY * attempt
                logger.warning(f"Model {model_name} overloaded (attempt {attempt}/{MAX_RETRIES}). Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def format_gemini_error(e: Exception) -> Dict[str, str]:
    """
    Classifies a Gemini API exception into user-friendly error types and messages.
    """
    err_str = str(e)
    err_lower = err_str.lower()
    
    if (
        "api_key_invalid" in err_lower
        or "api key not valid" in err_lower
        or "invalid api key" in err_lower
        or "api_key_not_found" in err_lower
        or ("400" in err_str and "key" in err_lower)
        or "unauthenticated" in err_lower
    ):
        return {
            "error_type": "invalid_key",
            "message": "Invalid Gemini API Key. Please verify your key at https://aistudio.google.com/app/apikey and ensure it is entered correctly.",
            "details": err_str
        }
    if "429" in err_str or "resource_exhausted" in err_lower or "quota" in err_lower:
        return {
            "error_type": "quota_exhausted",
            "message": "Gemini API quota exhausted or rate limit reached. Please check your project quota on Google AI Studio.",
            "details": err_str
        }
    if (
        "503" in err_str
        or "unavailable" in err_lower
        or "high demand" in err_lower
        or "overloaded" in err_lower
        or "service unavailable" in err_lower
    ):
        return {
            "error_type": "model_unavailable",
            "message": "The Gemini AI service is temporarily experiencing high traffic. Please retry in a few moments.",
            "details": err_str
        }
    if "timeout" in err_lower or "readtimeout" in err_lower or "timed out" in err_lower:
        return {
            "error_type": "timeout",
            "message": "Connection to Gemini API timed out. The server or model may be under heavy load; please retry.",
            "details": err_str
        }
    if "not_found" in err_lower or "404" in err_str:
        return {
            "error_type": "model_not_found",
            "message": "The selected Gemini model is currently not accessible with this API key.",
            "details": err_str
        }
    return {
        "error_type": "general_error",
        "message": f"Gemini API error: {err_str}",
        "details": err_str
    }


# Primary and fallback models (ordered by speed and reliability)
PREFERRED_MODELS = [
    "gemini-3.5-flash",        # Fast, stable, active
    "gemini-3.5-flash-lite",   # Fast lightweight fallback
    "gemini-3.1-flash-lite",   # High-efficiency fallback
    "gemini-3-flash-preview",  # Preview fallback
    "gemini-3.8-flash",        # Latest model fallback
]




def get_genai_client(custom_api_key: Optional[str] = None) -> genai.Client:
    """
    Initializes the Gemini client using a user-provided API key
    or the GEMINI_API_KEY environment variable.
    """
    api_key = (
        (custom_api_key or "").strip()
        or os.getenv("GEMINI_API_KEY", "").strip()
    )

    if not api_key:
        raise ValueError(
            "Gemini API key is missing. Configure GEMINI_API_KEY "
            "in the backend .env file or enter your key in website settings."
        )

    return genai.Client(api_key=api_key)



ANALYSIS_SYSTEM_PROMPT = """
You are an expert Senior Research Scientist and Academic Paper Analyst.
Your task is to analyze the provided research paper thoroughly, accurately, and objectively.

CRITICAL INSTRUCTIONS:
1. Analyze ONLY the provided text of the paper. Do NOT invent, assume, or hallucinate facts or results.
2. If any piece of information or section is absent or not explicitly stated in the paper, clearly and explicitly state: "Information not explicitly stated in the paper."
3. Every section must be insightful, detailed, and clear for academic and technical readers.
4. Note key page numbers or passages where relevant (the input text contains [PAGE X] indicators).

You must return valid JSON strictly following this schema:
{
  "paper_title": "Full formal title of the paper",
  "authors": ["Author 1", "Author 2"],
  "core_domain": "Primary field / research domain (e.g. Computer Vision, NLP, Bioinformatics)",
  "publication_info": "Venue / Year / Conference if mentioned, or 'Not stated in paper'",
  "key_terms": ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4", "Keyword 5"],
  
  "paper_summary": "Comprehensive 2-4 paragraph overview of the paper explaining what the research does, why it matters, and high-level outcomes.",
  
  "research_problem_and_objectives": {
    "problem_statement": "The core gap, challenge, or unsolved problem the paper addresses.",
    "objectives": [
      "Specific objective 1",
      "Specific objective 2"
    ],
    "motivation": "Why solving this problem is important or timely."
  },
  
  "key_contributions": [
    {
      "title": "Contribution title",
      "description": "Detailed explanation of what makes this novel or significant.",
      "page_reference": "e.g. Page 2, Section 3"
    }
  ],
  
  "research_methodology": {
    "approach_overview": "High-level description of proposed method, framework, or algorithm.",
    "architectural_details": "Details on architecture, datasets, models, or theoretical proofs used.",
    "baseline_comparisons": "What baseline models or prior works this was compared against (or 'None specified').",
    "implementation_details": "Hardware, hyperparameters, framework, or reproducibility details."
  },
  
  "results_and_findings": {
    "summary": "Key results and conclusions drawn from experiments or analysis.",
    "metrics_and_benchmarks": [
      "Benchmark/Dataset: Metric value vs baseline (e.g. Accuracy: 94.2% vs 91.0%)"
    ],
    "significance": "How these findings validate the proposed hypothesis."
  },
  
  "limitations": [
    "Limitation 1 explicitly discussed or evident in scope (cite page if available)",
    "Limitation 2..."
  ],
  
  "future_research_directions": [
    "Future direction 1 suggested by authors or arising from findings",
    "Future direction 2..."
  ]
}
"""


def analyze_paper_content(
    annotated_text: str,
    paper_metadata: Dict[str, Any],
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends the extracted PDF content to Gemini to generate the 7 structured sections.
    """
    client = get_genai_client(custom_api_key)

    # If paper text is very long, ensure it fits within context window
    # Gemini 2.5 Flash / 2.0 Flash has 1M+ token context window, so up to ~200k chars is well within range.
    trimmed_text = annotated_text[:300000]

    user_prompt = f"""
Please analyze the following research paper. Extract all 7 core sections and metadata into the required JSON format.

File Name: {paper_metadata.get('filename', 'Unknown')}
Estimated Pages: {paper_metadata.get('total_pages', 'Unknown')}

=== BEGIN RESEARCH PAPER TEXT ===
{trimmed_text}
=== END RESEARCH PAPER TEXT ===
"""

    last_error = None
    for model_name in PREFERRED_MODELS:
        try:
            logger.info(f"Attempting analysis using model: {model_name}")
            response = _generate_with_retry(
                client,
                model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=ANALYSIS_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            raw_json = response.text or "{}"
            parsed = json.loads(raw_json)
            parsed["analyzed_model"] = model_name
            return parsed

        except APIError as e:
            logger.warning(f"API Error with {model_name}: {str(e)}")
            last_error = e
            continue
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error with {model_name}: {str(e)}")
            # Try to recover if response has markdown blocks ```json
            try:
                cleaned = response.text.strip()
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()
                parsed = json.loads(cleaned)
                parsed["analyzed_model"] = model_name
                return parsed
            except Exception:
                last_error = e
                continue
        except Exception as e:
            logger.error(f"Unexpected error with {model_name}: {str(e)}")
            last_error = e
            break

    err_info = format_gemini_error(last_error) if last_error else {"message": "Could not analyze paper."}
    raise RuntimeError(f"Analysis failed: {err_info['message']}")


CHAT_SYSTEM_PROMPT = """
You are an expert AI Research Assistant helping the user explore and understand this specific research paper.

GUIDELINES:
1. Answer the user's question accurately using ONLY the information contained in the provided research paper.
2. When answering, cite the relevant page numbers whenever possible (e.g., "[Page 4]", "[Pages 6-7]"). The paper text includes [PAGE X] indicators.
3. If the paper does NOT contain the answer or does not mention the topic, explicitly state:
   "Based on the provided research paper, this information is not mentioned or discussed."
   Do NOT make up facts, external citations, or unverified claims.
4. Keep explanations clear, structured, and easy to understand. Use bullet points or code blocks where appropriate.
5. If the user asks for a simple explanation ("in simple words"), simplify the language while maintaining academic accuracy.
"""


def answer_paper_question(
    annotated_text: str,
    question: str,
    chat_history: List[Dict[str, str]],
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Answers user questions strictly regarding the uploaded paper, citing pages.
    """
    client = get_genai_client(custom_api_key)

    # Prepare context
    paper_context = annotated_text[:250000]

    # Format conversation history
    history_lines = []
    for msg in chat_history[-6:]:  # Keep recent context
        role = "User" if msg.get("role") == "user" else "Assistant"
        history_lines.append(f"{role}: {msg.get('content', '')}")
    history_str = "\n".join(history_lines) if history_lines else "None (first question)"

    prompt = f"""
=== RESEARCH PAPER TEXT (WITH [PAGE X] MARKERS) ===
{paper_context}
=== END RESEARCH PAPER ===

=== CONVERSATION HISTORY ===
{history_str}
=== END CONVERSATION HISTORY ===

USER QUESTION:
{question}

Provide a comprehensive, accurate answer based strictly on the paper, including specific [Page X] citations.
"""

    last_error = None
    for model_name in PREFERRED_MODELS:
        try:
            response = _generate_with_retry(
                client,
                model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=CHAT_SYSTEM_PROMPT,
                    temperature=0.3,
                ),
            )
            return {
                "answer": response.text,
                "model_used": model_name
            }
        except Exception as e:
            logger.warning(f"Chat failed with {model_name}: {str(e)}")
            last_error = e
            continue

    err_info = format_gemini_error(last_error) if last_error else {"message": "Could not generate answer."}
    raise RuntimeError(f"Chat failed: {err_info['message']}")
