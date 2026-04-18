"""
symptom.py - CLEAN VERSION (No audio dependency)
"""

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# Try Ollama SDK first
try:
    import ollama as _ollama
    _USE_OLLAMA_SDK = True
except ImportError:
    from openai import OpenAI as _OpenAI
    _ollama_client = _OpenAI(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        api_key="ollama",
    )
    _USE_OLLAMA_SDK = False


# Strong system prompt (forces valid JSON)
_SYSTEM_PROMPT = """
You are a medical assistant helping ELDERLY patients who do NOT understand medical jargon.

Return ONLY valid JSON.

STRICT RULES:
- No markdown
- No explanation
- Must be valid JSON
- Must start with { and end with }
- ALL JSON KEYS MUST BE IN ENGLISH EXACTLY AS SHOWN IN THE SCHEMA. DO NOT TRANSLATE THE KEYS.
- Translate only the VALUES into the user's language (e.g., Kannada, Hindi, Tamil) based on their input.

IMPORTANT:
- "name" MUST be a real, specific medical condition (e.g. "Common Cold", "Flu", "Allergic Rhinitis")
- DO NOT use generic words like "High", "Low", "Condition", "Unknown"
- DO NOT repeat the word "Condition" as a value
- YOU MUST EXTRACT MULTIPLE SYMPTOMS from the input text. Break them into distinct items in the list.
- YOU MUST PROVIDE EXACTLY 3 to 5 realistic conditions. NEVER return just 1 condition.
- Probabilities must be numbers between 0 and 1
- Probabilities should roughly sum to 1.0
- "simple_explanation" MUST be a 1-sentence plain-language description that an elderly person can understand.
  Example: "Migraine" → "A very strong headache, usually on one side of your head, that can make light and sound painful."
  Example: "Aortic Dissection" → "A serious tear in a large blood vessel near the heart — needs a doctor immediately."
  DO NOT use medical jargon in the explanation. Write as if explaining to a grandparent.

Schema:
{
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "predictions": [
    {"name": "Condition A", "probability": 0.5, "simple_explanation": "easy-to-understand explanation"},
    {"name": "Condition B", "probability": 0.3, "simple_explanation": "easy-to-understand explanation"},
    {"name": "Condition C", "probability": 0.2, "simple_explanation": "easy-to-understand explanation"}
  ],
  "triage_advice": "Short, simple advice in plain language",
  "emergency_warning": "Only if serious symptoms exist, otherwise empty"
}
"""


def _call_llm(user_text: str) -> str:
    """Call the LLM and return raw response."""
    if _USE_OLLAMA_SDK:
        resp = _ollama.chat(
            model=MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
        )
        return resp["message"]["content"].strip()
    else:
        resp = _ollama_client.chat.completions.create(
            model=MODEL,
            temperature=0,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
        )
        return resp.choices[0].message.content.strip()


def _parse_json(raw: str) -> dict:
    """Safely extract JSON from LLM output."""
    start = raw.find("{")
    end = raw.rfind("}") + 1

    if start == -1 or end == 0:
        return {}

    try:
        return json.loads(raw[start:end])
    except json.JSONDecodeError:
        return {}


def _smart_split(text: str) -> list[str]:
    """Fallback: split symptoms manually."""
    text = re.sub(r"\band\b", ",", text.lower())
    return [p.strip() for p in text.split(",") if p.strip()]


def analyze_text(text: str) -> dict:
    """
    Analyze user's symptom text.

    Returns:
    {
        "symptoms": [str],
        "conditions": [{ "name": str, "probability": float }],
        "advice": str,
        "warning": str
    }
    """
    try:
        raw = _call_llm(text)
        data = _parse_json(raw)
    except Exception as e:
        print("ERROR LLM error:", e)
        data = {}

    symptoms = data.get("symptoms") or _smart_split(text)

    return {
        "symptoms": symptoms,
        "conditions": data.get("predictions", []),
        "advice": data.get(
            "triage_advice",
            "Rest, stay hydrated, and monitor your symptoms."
        ),
        "warning": data.get("emergency_warning", ""),
    }