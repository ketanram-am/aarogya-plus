"""
pipeline.py - Prescription OCR -> medicine extraction -> FDA enrichment
Step 1 : Gemini Vision  -> raw text
Step 2 : Mistral (Ollama) -> structured JSON medicines
Step 3 : FDA API         -> purpose / indication
"""

import json
import re
import os
import base64
from pathlib import Path

import requests
from openai import OpenAI
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)
print(os.getenv("GEMINI_API_KEY"))
# -- Clients -------------------------------------------------------------------
ollama_client = OpenAI(
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
    api_key="ollama",
)

gemini_client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=os.getenv("GEMINI_API_KEY", ""),
)

OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL",  "qwen2.5:3b")
GEMINI_MODEL  = os.getenv("GEMINI_MODEL",  "gemini-2.5-flash-lite")


# -----------------------------------------------------------------------------
# STEP 1 - OCR via Gemini Vision
# -----------------------------------------------------------------------------

def extract_text(image_path: str) -> str:
    """Return the raw text content of a prescription image."""
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    # Detect mime type from extension
    ext = Path(image_path).suffix.lower()
    mime = {"jpg": "image/jpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".webp": "image/webp"}.get(ext, "image/jpeg")

    response = gemini_client.chat.completions.create(
        model=GEMINI_MODEL,
        temperature=0,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract ALL text exactly as it appears on this prescription. Do not interpret — just transcribe."},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
    )
    return response.choices[0].message.content.strip()


# -----------------------------------------------------------------------------
# STEP 2 - Structured medicine extraction via Mistral (Ollama)
# -----------------------------------------------------------------------------

_MED_PROMPT = """
You are reading a doctor's prescription.

Extract ALL medicines and return ONLY a valid JSON array — no markdown, no explanation.

Schema for each item:
{{
  "medicine_name": "clean name WITHOUT the word TABLET/CAP/SYR",
  "dosage": "e.g. 500MG",
  "schedule": "e.g. 1-0-1  (morning-afternoon-night, 1=take 0=skip)",
  "duration": "e.g. 5 Days",
  "food_instruction": "after meal | before meal | not specified"
}}

Rules:
- Ignore lab tests, doctor advice, patient details
- If a field is missing use "not specified"
- Return ONLY the JSON array, nothing else

Prescription text:
{text}
"""


def extract_medicines_json(text: str) -> list[dict]:
    """Parse prescription text -> list of medicine dicts."""
    response = ollama_client.chat.completions.create(
        model=OLLAMA_MODEL,
        temperature=0,
        messages=[{"role": "user", "content": _MED_PROMPT.format(text=text)}],
    )
    raw = response.choices[0].message.content.strip()
    print("Mistral raw output:\n", raw)

    # Strip markdown fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except Exception as e:
        print(f"JSON parse failed: {e} -- raw: {raw[:200]}")
        return []

# -----------------------------------------------------------------------------
# STEP 3 - Enrich with FDA drug label API
# -----------------------------------------------------------------------------

def get_medicine_purpose(name: str) -> str:
    """Fetch the first 250 chars of indications_and_usage from the FDA API."""
    try:
        url = "https://api.fda.gov/drug/label.json"
        params = {"search": f"openfda.generic_name:{name}", "limit": 1}
        res = requests.get(url, params=params, timeout=6)
        res.raise_for_status()
        data = res.json()
        usage = data["results"][0].get("indications_and_usage", ["Not found"])[0]
        return usage[:250].strip()
    except Exception as e:
        return f"Not found ({e})"


def enrich_with_purpose(medicines: list[dict]) -> list[dict]:
    for med in medicines:
        med["purpose"] = get_medicine_purpose(med.get("medicine_name", ""))
    return medicines


# -----------------------------------------------------------------------------
# PUBLIC ENTRY POINT
# -----------------------------------------------------------------------------

def run_pipeline(image_path: str) -> list[dict]:
    """
    Full pipeline: image → OCR text → medicines JSON → FDA enrichment.
    Returns a list of medicine dicts, or [] on failure.
    """
    print(f"\nOCR: {image_path}")
    text = extract_text(image_path)
    print(f"Extracted text ({len(text)} chars):\n{text[:500]}")

    print("\nExtracting medicines...")
    meds = extract_medicines_json(text)

    if not meds:
        print("No medicines extracted.")
        return []

    print(f"[OK] {len(meds)} medicine(s) found. Enriching with FDA data...")
    meds = enrich_with_purpose(meds)
    return meds
