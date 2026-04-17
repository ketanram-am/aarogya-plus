# Aarogya+ 🏥

Smart prescription reader, medicine reminder, and symptom analyser.

---

## Project Structure

```
AarogyaPlus/
├── backend/
│   ├── main.py          ← Flask API (entry point)
│   ├── pipeline.py      ← Prescription OCR + medicine extraction
│   ├── reminder.py      ← Scheduler + TTS reminders
│   ├── symptom.py       ← LLM symptom analysis
│   ├── locator.py       ← Pharmacy finder (Google Places / mock)
│   ├── requirements.txt
│   └── .env.example     ← Copy to .env and fill in keys
│
└── frontend/
    ├── src/
    │   ├── main.jsx     ← React entry point
    │   └── UI.jsx       ← All screens + components
    ├── index.html
    ├── package.json
    └── vite.config.js   ← Dev proxy: /api → localhost:5000
```

---

## Prerequisites

| Tool      | Version   | Purpose                          |
|-----------|-----------|----------------------------------|
| Python    | 3.10+     | Backend                          |
| Node.js   | 18+       | Frontend build                   |
| Ollama    | latest    | Local LLM (Mistral 7B)           |
| ffmpeg    | any       | Whisper audio processing         |

### Pull the Ollama model

```bash
ollama pull mistral:7b
```

---

## Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (required for OCR)

# 4. Run the server
python main.py
# → http://localhost:5000
```

### Required API keys

| Key                    | Where to get                                      | Required?        |
|------------------------|---------------------------------------------------|------------------|
| `GEMINI_API_KEY`       | https://aistudio.google.com/app/apikey            | ✅ Yes (for OCR) |
| `GOOGLE_PLACES_API_KEY`| https://console.cloud.google.com/                 | ❌ No (mock used) |

---

## Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run dev server (proxies /api to Flask on port 5000)
npm run dev
# → http://localhost:3000
```

---

## Production Build (serve frontend from Flask)

```bash
cd frontend
npm run build          # outputs to frontend/dist/

# Copy build to Flask static folder
cp -r dist/* ../backend/static/

# Now Flask serves everything on port 5000
cd ../backend
python main.py
```

---

## API Reference

| Method | Endpoint                | Description                      |
|--------|-------------------------|----------------------------------|
| POST   | `/api/analyze`          | Symptom text analysis            |
| POST   | `/api/audio`            | Voice symptom analysis (Whisper) |
| POST   | `/api/scan`             | Prescription image → medicines   |
| GET    | `/api/reminders`        | Today's dose schedule            |
| POST   | `/api/taken`            | Mark a dose as taken             |
| GET    | `/api/followup`         | Days remaining per medicine      |
| GET    | `/api/locate-medicine`  | Nearby pharmacies                |

All endpoints accept an optional `lang` query param / body field (e.g. `lang=hi`) for translations.

---

## Features

- 📷 **Prescription Scan** — Gemini Vision OCR → Mistral extraction → FDA enrichment
- 🩺 **Symptom Analysis** — text or voice → LLM triage with severity indicators
- ⏰ **Medicine Reminders** — auto-scheduled with TTS voice alerts
- 📅 **Follow-up Tracker** — days remaining with refill alerts
- 🏥 **Pharmacy Locator** — Google Places or mock pharmacies
- ⚕️ **Pharmacist Portal** — printable dispensing report
- 🌍 **Multi-language** — English, Hindi, Tamil, Telugu, Kannada, Spanish, French

---

## Troubleshooting

**Ollama not responding**
```bash
ollama serve          # Start Ollama server
ollama list           # Check if mistral:7b is downloaded
```

**Whisper installation issues**
```bash
pip install openai-whisper
# Also requires ffmpeg: https://ffmpeg.org/download.html
```

**CORS errors in browser**
Flask-CORS is configured to allow all origins for `/api/*`. If you still see CORS errors, ensure you're using the Vite dev server (port 3000) which proxies to Flask.
