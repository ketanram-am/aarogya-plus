# Aarogya+ 🏥

<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen.svg" alt="Status" />
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python Version" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Flask-API-black.svg?logo=flask" alt="Flask" />
  <img src="https://img.shields.io/badge/Ollama-Mistral_7B-white.svg" alt="Ollama" />
  <img src="https://img.shields.io/badge/OpenStreetMap-Integration-7ebd42.svg?logo=openstreetmap" alt="OpenStreetMap" />
</div>

<br />

**Aarogya+** is an advanced AI-powered web application built specifically to make healthcare interactions stress-free for the elderly and visually impaired. Originally a monolithic project, it has been robustly refactored into a completely open and modular platform.

From scanning messy doctor prescriptions using cutting-edge OCR, to an AI symptom analyzer and a free local pharmacy locator, Aarogya+ is your all-in-one digital health companion.

---

## ✨ Key Features

- 🗣️ **Multilingual & Voice-First** — Interfaces and Text-to-Speech support spanning English, Hindi, Tamil, Telugu, Kannada, Spanish, and French. Includes browser-based speech recognition.
- 📷 **Smart Prescription Scanner** — Uses Gemini Vision OCR and an FDA-data pipeline to instantly digitize and format handwritten prescriptions.
- 🩺 **LLM Symptom Analyzer** — Powered locally via Ollama (`mistral:7b`), offering smart triage advice, warnings, and localized translations without risking privacy.
- ⏰ **Medication Reminders** — Auto-scheduling tools with TTS voice alerts and follow-up / dosage trackers.
- 📍 **Free Pharmacy Locator** — Replaced costly Google APIs with completely free **OpenStreetMap (Overpass API)** and **OSRM** integration to find open local pharmacies near you.
- 🏥 **Medical History System** — Built-in SQLite database securely storing past scans, eliminating duplicate reads.
- 👵 **Accessibility-Centric UI** — Large font sizes, clear contrast ratios, dynamic micro-animations, and easily tappable interfaces tailored for seniors.

---

## 🏗️ Architecture & Project Structure

The project has been aggressively refactored for best practices, splitting monolithic React systems into modular architecture:

```text
AarogyaPlus/
├── backend/                  # Flask RESTful API Environment
│   ├── main.py               # Main Flask app & routing
│   ├── pipeline.py           # OCR & LLM extraction orchestration
│   ├── reminder.py           # Scheduler & TTS audio generation
│   ├── symptom.py            # Local Ollama Mistral logic
│   ├── locator.py            # OpenStreetMap/Overpass locator integration
│   ├── database.py           # Persistent SQLite operations
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment vars template
│
└── frontend/                 # Modular React + Vite Frontend
    ├── src/
    │   ├── components/       # Reusable UI parts (Header, Loaders, Buttons)
    │   ├── pages/            # Full page views (HomeScreen, Locator, etc.)
    │   ├── services/         # API hooks (Flask integration)
    │   ├── constants/        # Routes, configs, theme lists
    │   ├── utils/            # Helper logic
    │   └── main.jsx          # Vite React injection point
    ├── vite.config.js        # Port 3000 -> 5000 Proxy config
    └── package.json          # Node dependencies
```

---

## 🚀 Setup & Installation

### Prerequisites

| Tech       | Version   | Requirement |
| ---------- | --------- | ----------- |
| Python     | 3.10+     | Flask App   |
| Node.js    | 18+       | Vite/React  |
| Ollama     | latest    | Local LLM   |

**1. Pull the Local Machine Learning Model**
This is vital for the intelligent symptom analyzer locally.
```bash
ollama pull mistral:7b
```

### Backend (Flask Setup)

```bash
cd backend

# Initialize Virtual Environment
python -m venv venv
source venv/bin/activate       # On Windows use: venv\Scripts\activate

# Install Core Dependencies
pip install -r requirements.txt

# Environment Config
cp .env.example .env
# Open .env and insert your GEMINI_API_KEY from Google AI Studio. 
# NOTE: The pharmacy locator uses OpenStreetMap and does NOT require billing!

# Launch Backend Server
python main.py
```
*API running on `http://localhost:5000`*

### Frontend (React + Vite Setup)

```bash
cd frontend

# Install Node modules
npm install

# Start Development Server
npm run dev
```
*Frontend running on `http://localhost:3000` (API calls automatically proxy to `5000`)*

---

## 🚢 Production Deployment

To package the front-end directly into Flask's static assets for production:

```bash
cd frontend
npm run build:backend   # Custom script builds Vite and copies directly to /backend/static/

cd ../backend
python main.py
```
Vist `http://localhost:5000` and the Flask server will intelligently serve the React build while handling REST API routes.

---

## 📡 Core API Reference

The backend exposes the following robust API endpoints, all natively supporting the `?lang=` parameter for instant i18n translation:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/analyze` | Generates diagnostic advice from text/audio inputs via Mistral |
| **POST** | `/api/scan` | Processes uploaded prescription image -> structured JSON |
| **POST** | `/api/save-prescription` | Permanently stores a scanned RX in the `database.py` history |
| **GET** | `/api/prescriptions` | Fetches historical patient history |
| **GET** | `/api/locate-medicine`| Triggers OpenStreetMap to fetch closest pharmacies using lat/lon |
| **GET** | `/api/reminders` | Fetches the current TTS-enabled daily schedule |

---

## 🐞 Troubleshooting

- **Symptom Analyzer timing out/hanging:** Check if Ollama is running. Run `ollama serve` in a background terminal.
- **Microphone not working:** Browsers require app rendering from `localhost` or via `HTTPS` to grant microphone permission. Wait ~500ms after clicking the Mic icon.
- **Port Conflicts:** If `localhost:5000` is in use (often by MacOS system services), alter the `PORT` inside the backend `.env` file, and ensure `proxy` in `vite.config.js` is identically updated.
- **Locator fails:** OpenStreetMap Overpass servers might briefly rate limit. The app runs a fallback algorithm, wait a few minutes and try again.

---

**Made with ❤️ for Health Tech & Open Source.**

