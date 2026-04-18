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

INDIAN_BRAND_MAP = {
    "dolo": "acetaminophen",
    "dolo paracetamol": "acetaminophen",
    "paracetamol": "acetaminophen",
    "sinarest": "chlorpheniramine + acetaminophen + phenylephrine",
    "crocin": "acetaminophen",
    "calpol": "acetaminophen",
    "allegra": "fexofenadine",
    "augmentin": "amoxicillin + clavulanate",
    "meftal": "mefenamic acid",
    "rantac": "ranitidine",
    "pantocid": "pantoprazole",
    "pan": "pantoprazole",
    "azithral": "azithromycin",
    "citralka": "disodium hydrogen citrate",
    "combiflam": "ibuprofen + acetaminophen",
    "brufen": "ibuprofen",
    "volini": "diclofenac",
    "voveran": "diclofenac",
    "zifi": "cefixime",
    "montek": "montelukast",
    "montair": "montelukast",
    "taxim": "cefotaxime",
    "okacet": "cetirizine",
    "cheston": "cetirizine + phenylephrine + acetaminophen",
    "zerodol": "aceclofenac",
}

def normalize_medicine_name(raw_name: str) -> str:
    """Normalize Indian/brand names to US generic using RxNorm."""
    clean_name = re.sub(r'[^a-zA-Z\s]', '', raw_name).strip().lower()

    if clean_name in INDIAN_BRAND_MAP:
        return INDIAN_BRAND_MAP[clean_name]

    first_word = clean_name.split()[0] if clean_name else ""
    if first_word in INDIAN_BRAND_MAP:
        return INDIAN_BRAND_MAP[first_word]

    try:
        url = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"
        params = {"term": clean_name, "maxEntries": 1}
        res = requests.get(url, params=params, timeout=5)
        if res.ok:
            data = res.json()
            candidates = data.get("approximateGroup", {}).get("candidate", [])
            if candidates:
                rxcui = candidates[0].get("rxcui")
                prop_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json"
                prop_res = requests.get(prop_url, timeout=5)
                if prop_res.ok:
                    prop_data = prop_res.json()
                    name = prop_data.get("properties", {}).get("name")
                    if name:
                        return name.lower()
    except Exception as e:
        print(f"RxNorm lookup failed for '{clean_name}': {e}")
    
    return clean_name

def clean_purpose_text(text: str) -> str:
    """Clean up formatting artifacts and duplicate headers from FDA text."""
    if not text or text == "Not found":
        return text
    
    text = re.sub(r'(?i)^(?:1\s*)?INDICATIONS AND USAGE:?\s*', '', text)
    text = re.sub(r'(?i)^(?:1\s*)?INDICATIONS & USAGE:?\s*', '', text)
    text = re.sub(r'(?i)^(?:1\s*)?INDICATIONS AND USAGE\s*', '', text)
    
    text = re.sub(r'^\d+\s+', '', text)
    text = text.replace('\n', ' ').strip()
    
    if len(text) > 300:
        match = re.search(r'(?<=[.!?])\s', text[200:300])
        if match:
            text = text[:200 + match.start()].strip()
        else:
            text = text[:297] + "..."
            
    return text

def get_medicine_purpose(raw_name: str) -> str:
    """Fetch the purpose/indications from the FDA API using normalized name."""
    name = normalize_medicine_name(raw_name)
    print(f"Normalized '{raw_name}' -> '{name}'")
    try:
        url = "https://api.fda.gov/drug/label.json"
        search_query = f'openfda.generic_name:"{name}"'
        if '+' in name:
            search_query = ' AND '.join([f'openfda.generic_name:"{n.strip()}"' for n in name.split('+')])
        params = {"search": search_query, "limit": 1}
        res = requests.get(url, params=params, timeout=6)
        
        if not res.ok and '+' not in name:
            params = {"search": f'openfda.brand_name:"{name}"', "limit": 1}
            res = requests.get(url, params=params, timeout=6)
            
        res.raise_for_status()
        data = res.json()
        
        results = data.get("results", [{}])[0]
        usage = results.get("indications_and_usage", [])
        if usage:
            return clean_purpose_text(usage[0])
            
        purpose = results.get("purpose", [])
        if purpose:
            return clean_purpose_text(purpose[0])
            
        return "Not found"
    except Exception as e:
        return f"Not found ({e})"

def simplify_purpose(text: str) -> str:
    """Simplify the medical purpose text for elderly users."""
    if not text or text == "Not found" or text.startswith("Not found"):
        return text
        
    prompt = f"Explain this medicine's primary purpose for an elderly patient in simple, everyday English. Keep it directly factual and to a single short sentence, maximum 10-15 words. Don't use medical jargon. Raw text: '{text}'"
    
    try:
        response = ollama_client.chat.completions.create(
            model=OLLAMA_MODEL,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        simplified = response.choices[0].message.content.strip()
        # Clean up any surrounding quotes if present
        simplified = re.sub(r'^["\']|["\']$', '', simplified)
        return simplified
    except Exception as e:
        print(f"Simplification failed: {e}")
        return text

def enrich_with_purpose(medicines: list[dict]) -> list[dict]:
    for med in medicines:
        raw_purpose = get_medicine_purpose(med.get("medicine_name", ""))
        med["purpose"] = simplify_purpose(raw_purpose)
    return medicines


# -----------------------------------------------------------------------------
# PUBLIC ENTRY POINT
# -----------------------------------------------------------------------------

_META_PROMPT = """
You are reading raw OCR text from a doctor's prescription.
Extract the patient and doctor metadata and return ONLY a valid JSON object — no markdown, no explanation.

Schema:
{{
  "patient_name": "full patient name",
  "patient_age": "age with unit e.g. 31 Years",
  "patient_gender": "Male/Female",
  "doctor_name": "full doctor name including Dr. prefix",
  "doctor_speciality": "speciality e.g. MBBS - Internal Medicine",
  "doctor_reg_id": "registration ID e.g. TNMC - 884321",
  "diagnosis": "diagnosis text",
  "description": "symptom description"
}}

Rules:
- Read the text VERY carefully. The doctor name is usually at the TOP of the prescription after "Rx" or "Dr."
- The patient name is usually after "Name" or "Patient Name"
- If a field is genuinely not present, use ""
- Return ONLY the JSON object, nothing else

OCR Text:
{text}
"""

def extract_patient_json(text: str) -> dict:
    """Parse prescription OCR text -> dict of patient metadata using Gemini."""
    try:
        response = gemini_client.chat.completions.create(
            model=GEMINI_MODEL,
            temperature=0,
            messages=[{"role": "user", "content": _META_PROMPT.format(text=text)}],
        )
        raw = response.choices[0].message.content.strip()
        print(f"Gemini metadata raw:\n{raw[:300]}")
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        result = json.loads(cleaned)
        print(f"[OK] Patient metadata: {result.get('patient_name', '?')} / Dr. {result.get('doctor_name', '?')}")
        return result
    except Exception as e:
        print(f"Patient JSON parse failed: {e}")
        return {}

def run_pipeline(image_path: str) -> dict:
    """
    Full pipeline: image → OCR text → medicines JSON + patient JSON → FDA enrichment.
    Returns a dict with {"patient": {...}, "medicines": [...], "ocr_text": str}, or None on failure.
    """
    print(f"\nOCR: {image_path}")
    text = extract_text(image_path)
    print(f"Extracted text ({len(text)} chars):\n{text[:500]}")

    print("\nExtracting medicines...")
    meds = extract_medicines_json(text)

    if not meds:
        print("No medicines extracted.")
        return None

    print(f"[OK] {len(meds)} medicine(s) found. Enriching with FDA data...")
    meds = enrich_with_purpose(meds)
    
    print("\nExtracting patient metadata via Gemini...")
    patient_meta = extract_patient_json(text)

    return {
        "patient": patient_meta,
        "medicines": meds
    }

