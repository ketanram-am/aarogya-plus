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
from database import save_prescription, get_all_prescriptions, get_prescription_by_id

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
    """Translate a list of strings in one API call with fallback to individual translation."""
    if target_lang == "en" or not texts:
        return texts
    try:
        translated = GoogleTranslator(source="auto", target=target_lang).translate_batch(texts)
        # Ensure we return valid strings
        return [t if t else texts[i] for i, t in enumerate(translated)]
    except Exception as e:
        print(f"ERROR Batch translation error: {e}. Falling back to individual translation.")
        fallback = []
        translator = GoogleTranslator(source="auto", target=target_lang)
        for t in texts:
            try:
                res = translator.translate(t)
                fallback.append(res if res else t)
            except Exception:
                fallback.append(t)
        return fallback


def translate_symptom_response(result: dict, lang: str) -> dict:
    """Translate the /api/analyze response fields."""
    if lang == "en":
        return result

    sym_len = len(result.get("symptoms", []))
    cond_len = len(result.get("conditions", []))

    texts = (
        result.get("symptoms", [])
        + [c["name"] for c in result.get("conditions", [])]
        + [c.get("simple_explanation", "") for c in result.get("conditions", [])]
        + [result.get("advice", ""), result.get("warning", "")]
    )

    translated = batch_translate(texts, lang)

    result["symptoms"] = translated[:sym_len]
    idx = sym_len
    for cond in result.get("conditions", []):
        cond["name"] = translated[idx]
        idx += 1
    for cond in result.get("conditions", []):
        cond["simple_explanation"] = translated[idx]
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
    """Translate string values in a list of dicts.
    Handles brand names like DOLO by converting to Title Case before translation."""
    if lang == "en" or not data:
        return data

    # Fields that should NOT be translated (pure identifiers or images)
    SKIP_KEYS = {"dosage", "medicine_image"}

    texts, key_map = [], []
    for item in data:
        for k, v in item.items():
            if isinstance(v, str) and k not in SKIP_KEYS:
                # Convert all-caps brand names to Title Case for better translation
                val = v.title() if k == "medicine_name" and v.isupper() else v
                texts.append(val)
                key_map.append((item, k))

    translated = batch_translate(texts, lang)

    for i, (item, k) in enumerate(key_map):
        if i < len(translated):
            item[k] = translated[i]

    return data

def translate_prescription(rx: dict, lang: str) -> dict:
    """Helper to translate a single prescription (meta + medicines)."""
    if not rx or lang == "en":
        return rx
    # Translate meta fields
    meta_keys = ["doctor_name", "doctor_speciality", "patient_name", "diagnosis", "description"]
    texts, map_keys = [], []
    for k in meta_keys:
        if rx.get(k):
            texts.append(rx[k])
            map_keys.append(k)
    
    translated = batch_translate(texts, lang)
    for i, k in enumerate(map_keys):
        rx[k] = translated[i]
        
    # Translate medicines list
    if rx.get("prescription_medicines"):
        translate_list(rx["prescription_medicines"], lang)
    
    return rx

def translate_history(history: list[dict], lang: str) -> list[dict]:
    """Helper to translate the entire history list."""
    if not history or lang == "en":
        return history
    # Translate each item
    for rx in history:
        # Translate main display fields
        fields = ["doctor_name", "patient_name", "diagnosis"]
        texts = [rx.get(f) for f in fields if rx.get(f)]
        if texts:
            trans = batch_translate(texts, lang)
            idx = 0
            for f in fields:
                if rx.get(f):
                    rx[f] = trans[idx]
                    idx += 1
        # Also translate nested medicines if they exist
        if rx.get("prescription_medicines"):
            translate_list(rx["prescription_medicines"], lang)
    return history



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


# Store the last scan result temporarily so the user can choose to save it
_last_scan = {}

@app.post("/api/scan")
def scan():
    """POST multipart { image: File, lang } → medicine list + start reminders. Does NOT auto-save to history."""
    global _last_scan
    path = None
    try:
        file = request.files.get("image")
        lang = request.form.get("lang", "en")

        if not file:
            return jsonify({"error": "No image uploaded"}), 400

        path = save_temp(file)
        pipeline_res = run_pipeline(path)

        if not pipeline_res or not pipeline_res.get("medicines"):
            return jsonify({"error": "No medicines detected. Try a clearer image."}), 400

        meds = pipeline_res["medicines"]
        patient_meta = pipeline_res.get("patient", {})
        
        # Store scan data temporarily (user must explicitly save to history)
        import base64
        image_b64 = ""
        if path and os.path.exists(path):
            with open(path, "rb") as img_f:
                image_b64 = base64.b64encode(img_f.read()).decode("utf-8")
        
        _last_scan = {
            "patient": patient_meta,
            "medicines": meds,
            "image_b64": image_b64
        }

        meds_for_reminders = normalize_to_english([m.copy() for m in meds])
        initialize(meds_for_reminders)           # start reminder scheduler
        
        # Convert schedules to English words so the translation API can translate them dynamically
        sched_map = {
            "1-0-0": "Morning only", "0-1-0": "Afternoon only",
            "0-0-1": "Night only", "1-1-0": "Morning & Afternoon",
            "1-0-1": "Morning & Night", "0-1-1": "Afternoon & Night",
            "1-1-1": "3 times daily"
        }
        meds_display = normalize_to_english([m.copy() for m in meds])
        for m in meds_display:
            if m.get("schedule") in sched_map:
                m["schedule"] = sched_map[m["schedule"]]

        translated_meds = translate_list(meds_display, lang)

        return jsonify({
            "medicines": translated_meds,
            "patient": patient_meta,
            "message": "Reminders scheduled [OK]",
            "can_save": True
        })

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


@app.post("/api/save-prescription")
def save_rx():
    """POST — Save the last scanned prescription to medical history. Checks for duplicates."""
    global _last_scan
    try:
        if not _last_scan or not _last_scan.get("medicines"):
            return jsonify({"error": "No recent scan to save. Please scan a prescription first."}), 400
        
        patient_meta = _last_scan["patient"]
        meds = _last_scan["medicines"]
        image_b64 = _last_scan.get("image_b64", "")
        
        result = save_prescription(patient_meta, meds, image_b64)
        
        if result == "DUPLICATE":
            return jsonify({"message": "This prescription is already saved in your medical history.", "duplicate": True})
        elif result:
            _last_scan = {}  # Clear after successful save
            return jsonify({"message": "Saved to medical history!", "prescription_id": result})
        else:
            return jsonify({"error": "Could not save. Check database connection."}), 500
    except Exception as e:
        print(f"ERROR /api/save-prescription: {e}")
        return jsonify({"error": f"Save failed: {str(e)[:100]}"}), 500

@app.get("/api/prescriptions")
def history():
    """GET ?lang=en → past prescriptions list."""
    try:
        lang = request.args.get("lang", "en")
        history = get_all_prescriptions()
        return jsonify(translate_history(history, lang))
    except Exception as e:
        print(f"ERROR /api/prescriptions: {e}")
        return jsonify([])

@app.get("/api/prescriptions/<string:pid>")
def get_prescription(pid):
    try:
        lang = request.args.get("lang", "en")
        rx = get_prescription_by_id(pid)
        return jsonify(translate_prescription(rx, lang))
    except Exception as e:
        print(f"ERROR /api/prescriptions/{pid}: {e}")
        return jsonify(None)

@app.delete("/api/prescriptions/<string:pid>")
def delete_prescription_route(pid):
    try:
        from database import delete_prescription
        delete_prescription(pid)
        return jsonify({"success": True})
    except Exception as e:
        print(f"ERROR DELETE /api/prescriptions/{pid}: {e}")
        return jsonify({"error": str(e)}), 500


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
    try:
        name = request.args.get("name", "").strip()
        lat_raw = request.args.get("lat")
        lng_raw = request.args.get("lng")

        print(f"DEBUG: locate params: name='{name}', lat='{lat_raw}', lng='{lng_raw}'")

        # ✅ Safe parsing (no 400)
        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
        except Exception as e:
            print(f"DEBUG: Float error: {e}")
            return jsonify({
                "results": [],
                "error": "Invalid latitude/longitude"
            })

        print(f"📍 Parsed location: {lat}, {lng}")

        try:
            results = find_medicine_nearby(name, lat, lng)
        except Exception as e:
            print(f"DEBUG: Locator failed: {e}")
            return jsonify({
                "results": [],
                "error": "Pharmacy search failed"
            })

        return jsonify(results)

    except Exception as e:
        print(f"DEBUG: Route error: {e}")
        return jsonify({
            "results": [],
            "error": "Internal server error"
        })
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    print(f"\n[OK] Aarogya+ backend running -> http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
