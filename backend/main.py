"""
main.py — Aarogya+ Flask backend
Run: python main.py
"""

import os
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from deep_translator import GoogleTranslator

# -- Load .env from the backend directory --------------------------------------
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# -- Local module imports ------------------------------------------------------
from symptom import analyze_text
from pipeline import run_pipeline
from reminder import initialize, get_today, mark_taken, get_followup
from locator import find_medicine_nearby

# -- Try loading Whisper (optional - audio endpoint degrades gracefully) --------
# try:
#     import whisper
#     stt_model = whisper.load_model("base")
#     print("✅ Whisper loaded")
# except Exception as e:
#     stt_model = None
#     print(f"⚠️  Whisper not available ({e}). /api/audio will return empty transcript.")

# -- App setup -----------------------------------------------------------------
# In production, React build is served from backend/static/
app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app, resources={r"/api/*": {"origins": "*"}})


# -----------------------------------------------------------------------------

def batch_translate(texts: list[str], target_lang: str) -> list[str]:
    """Translate a list of strings in one API call."""
    if target_lang == "en" or not texts:
        return texts
    try:
        return GoogleTranslator(source="auto", target=target_lang).translate_batch(texts)
    except Exception as e:
        print(f"ERROR Batch translation error: {e}")
        return texts


def translate_symptom_response(result: dict, lang: str) -> dict:
    """Translate the /api/analyze response fields."""
    if lang == "en":
        return result

    sym_len = len(result.get("symptoms", []))
    cond_len = len(result.get("conditions", []))

    texts = (
        result.get("symptoms", [])
        + [c["name"] for c in result.get("conditions", [])]
        + [result.get("advice", ""), result.get("warning", "")]
    )

    translated = batch_translate(texts, lang)

    result["symptoms"] = translated[:sym_len]
    idx = sym_len
    for cond in result.get("conditions", []):
        cond["name"] = translated[idx]
        idx += 1
    result["advice"] = translated[idx] if idx < len(translated) else result.get("advice", "")
    result["warning"] = translated[idx + 1] if idx + 1 < len(translated) else result.get("warning", "")
    return result


def normalize_to_english(data: list[dict]) -> list[dict]:
    """Translate every string value in a list of dicts back to English."""
    out = []
    for item in data:
        clean = {}
        for k, v in item.items():
            if isinstance(v, str):
                try:
                    clean[k] = GoogleTranslator(source="auto", target="en").translate(v)
                except Exception:
                    clean[k] = v
            else:
                clean[k] = v
        out.append(clean)
    return out


def translate_list(data: list[dict], lang: str) -> list[dict]:
    """Translate all string values in a list of dicts to target lang."""
    if lang == "en" or not data:
        return data

    texts, counts = [], []
    for item in data:
        row_texts = [v for v in item.values() if isinstance(v, str)]
        texts.extend(row_texts)
        counts.append(len(row_texts))

    translated = batch_translate(texts, lang)

    out, idx = [], 0
    for item, count in zip(data, counts):
        new_item = {}
        for k, v in item.items():
            if isinstance(v, str):
                new_item[k] = translated[idx] if idx < len(translated) else v
                idx += 1
            else:
                new_item[k] = v
        out.append(new_item)
    return out


# -----------------------------------------------------------------------------
# AUDIO HELPERS
# -----------------------------------------------------------------------------

def save_temp(file) -> str:
    suffix = os.path.splitext(file.filename)[1] or ".tmp"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    file.save(tmp.name)
    tmp.close()
    return tmp.name


# def transcribe_audio(file_path: str) -> str:
#     if not stt_model:
#         return ""
#     try:
#         result = stt_model.transcribe(file_path, task="translate", fp16=False)
#         return result.get("text", "").strip()
#     except Exception as e:
#         print(f"❌ STT error: {e}")
#         return ""


# -----------------------------------------------------------------------------
# STATIC (React build)
# -----------------------------------------------------------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve React build from backend/static/. Falls back to index.html for SPA routing."""
    static_dir = Path(app.static_folder)
    file = static_dir / path
    if path and file.exists():
        return send_from_directory(app.static_folder, path)
    index = static_dir / "index.html"
    if index.exists():
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({"status": "Aarogya+ API running. Frontend not built yet."}), 200


# -----------------------------------------------------------------------------
# API ROUTES
# -----------------------------------------------------------------------------

@app.post("/api/analyze")
def analyze():
    """POST { text, lang } → symptom analysis."""
    try:
        body = request.get_json(silent=True) or {}
        text = (body.get("text") or "").strip()[:500]
        lang = body.get("lang", "en")

        if not text:
            return jsonify({"error": "Enter symptoms"}), 400

        english_text = text
        if lang != "en":
            try:
                english_text = GoogleTranslator(source="auto", target="en").translate(text)
            except Exception as e:
                print(f"Translation to en failed: {e}")

        result = analyze_text(english_text)
        result = translate_symptom_response(result, lang)
        return jsonify(result)
    except Exception as e:
        print(f"ERROR /api/analyze: {e}")
        err_msg = str(e).lower()
        if "429" in err_msg or "quota" in err_msg:
            return jsonify({"error": "Google API quota exceeded. Please try again later."}), 429
        if "403" in err_msg or "leaked" in err_msg:
            return jsonify({"error": "Google API key is leaked or invalid. Please check backend/.env"}), 403
        return jsonify({"error": f"Analysis failed: {str(e)[:100]}"}), 500


# @app.post("/api/audio")
# def audio():
#     """POST multipart { audio: File, lang } → transcription + symptom analysis."""
#     path = None
#     try:
#         file = request.files.get("audio")
#         lang = request.form.get("lang", "en")

#         if not file:
#             return jsonify({"error": "No audio file provided"}), 400

#         path = save_temp(file)
#         transcript = transcribe_audio(path)[:500]

#         if not transcript:
#             return jsonify({"error": "Could not transcribe audio. Try typing your symptoms instead."}), 400

#         result = analyze_text(transcript)
#         result = translate_symptom_response(result, lang)
#         result["transcript"] = transcript
#         return jsonify(result)

#     except Exception as e:
#         print(f"❌ /api/audio: {e}")
#         err_msg = str(e).lower()
#         if "429" in err_msg or "quota" in err_msg:
#             return jsonify({"error": "Google API quota exceeded. Please try again later."}), 429
#         if "403" in err_msg or "leaked" in err_msg:
#             return jsonify({"error": "Google API key is leaked or invalid."}), 403
#         return jsonify({"error": f"Audio processing failed: {str(e)[:100]}"}), 500

#     finally:
#         if path and os.path.exists(path):
#             os.unlink(path)


@app.post("/api/scan")
def scan():
    """POST multipart { image: File, lang } → medicine list + start reminders."""
    path = None
    try:
        file = request.files.get("image")
        lang = request.form.get("lang", "en")

        if not file:
            return jsonify({"error": "No image uploaded"}), 400

        path = save_temp(file)
        meds = run_pipeline(path)

        if not meds:
            return jsonify({"error": "No medicines detected. Try a clearer image."}), 400

        meds = normalize_to_english(meds)
        initialize(meds)                        # start reminder scheduler
        translated_meds = translate_list(meds, lang)

        return jsonify({"medicines": translated_meds, "message": "Reminders scheduled [OK]"})

    except Exception as e:
        print(f"ERROR /api/scan: {e}")
        err_msg = str(e).lower()
        if "429" in err_msg or "quota" in err_msg:
            return jsonify({"error": "Google API quota exceeded. Please try again later."}), 429
        if "403" in err_msg or "leaked" in err_msg:
            return jsonify({"error": "Google API key is leaked or invalid."}), 403
        return jsonify({"error": f"Scan failed: {str(e)[:100]}"}), 500

    finally:
        if path and os.path.exists(path):
            os.unlink(path)


@app.get("/api/reminders")
def reminders():
    """GET ?lang=en → today's medicine schedule."""
    try:
        lang = request.args.get("lang", "en")
        return jsonify(translate_list(get_today(), lang))
    except Exception as e:
        print(f"ERROR /api/reminders: {e}")
        return jsonify([])


@app.post("/api/taken")
def taken():
    """POST { medicine_name, time } → mark dose as taken."""
    try:
        body = request.get_json(silent=True) or {}
        med  = body.get("medicine_name", "").strip()
        time = body.get("time", "").strip()
        if not med or not time:
            return jsonify({"error": "medicine_name and time are required"}), 400
        mark_taken(med, time)
        return jsonify({"success": True})
    except Exception as e:
        print(f"❌ /api/taken: {e}")
        return jsonify({"error": "Failed to mark taken"}), 500


@app.get("/api/followup")
def followup():
    """GET ?lang=en → prescription follow-up / days remaining."""
    try:
        lang = request.args.get("lang", "en")
        return jsonify(translate_list(get_followup(), lang))
    except Exception as e:
        print(f"❌ /api/followup: {e}")
        return jsonify([])


@app.get("/api/locate-medicine")
def locate_medicine():
    """GET ?name=Paracetamol&lat=12.97&lng=77.59 → nearby pharmacies."""
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "medicine name required"}), 400

    try:
        lat = float(request.args["lat"]) if "lat" in request.args else None
        lng = float(request.args["lng"]) if "lng" in request.args else None
    except (ValueError, KeyError):
        return jsonify({"error": "invalid lat/lng"}), 400

    results = find_medicine_nearby(name, lat, lng)
    return jsonify({"medicine": name, "results": results})


# -----------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    print(f"\n[OK] Aarogya+ backend running -> http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
