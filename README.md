# TrustLens AI (Scam or Safe?) — Unified Multimodal Digital Trust & Safety Platform

> **Think Before You Click. Verify Before You Believe. Defense Across Every Modality.**

**TrustLens AI** is an end-to-end multimodal cybersecurity awareness, verification, and threat intelligence platform designed to protect citizens against digital deception and fraud across text, visual media, voice audio, and video:

1. 🌌 **Unified Multimodal AI Analyzer**:
   - 📝 **Text**: SMS, WhatsApp forwards, emails, banking/UPI alerts, job offers, lottery notifications.
   - 🖼️ **Images**: JPG, PNG, WEBP OCR extraction, fake payment slips, screenshot threat detection, and QR code destination extraction (sent to URL Safety Engine without auto-opening).
   - 🎙️ **Voice Audio**: MP3, WAV, M4A transcription using Groq Whisper (`whisper-large-v3`) with speech scam pattern evaluation.
   - 🎥 **Video**: MP4 keyframe visual OCR, speech audio transcription, and combined threat scoring (with explicit forensic deepfake disclaimer).
2. 🇮🇳 **Regional Language Intelligence**:
   - Native support for **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिंदी)**.
   - Automated script recognition (`[\u0C80-\u0CFF]`, `[\u0900-\u097F]`) and code-mixed dialect detection (Hinglish, Kanglish).
   - Verbatim original text preservation alongside localized actionable guidance.
3. ⚖️ **Multi-Model AI Consensus Engine**:
   - Cross-model synthesis comparing **Google Gemini**, **Groq (LLaMA 3.3)**, **Mistral AI**, and a 13-category deterministic rule engine.
   - Computes agreement metrics (%), per-model votes, points of agreement, discrepancies, and missing evidence.
4. 🤖 **TrustLens AI Cyber Safety Assistant**:
   - 24/7 conversational cybersecurity advisor with context awareness of user's past scans.
   - Instant emergency response protocol for compromised users (dial **1930**, report on **cybercrime.gov.in**, freeze bank accounts/UPI).
   - Strict credential guardrails refusing to store or process private passwords, OTPs, or UPI PINs.
   - Chat attachment support for analyzing screenshots directly in conversation.
5. 🔗 **URL Safety & Threat Intelligence Engine**:
   - Google Safe Browsing v4 and VirusTotal API integration.
   - Local heuristics: lookalike typosquatting domains, punycode/IDN attacks, direct IP hosts, transport security checks (HTTPS vs HTTP), social engineering keywords, IANA RDAP domain age calculation, and safe HTTP redirect tracing with strict SSRF & private IP defenses.
6. 📰 **Fake News Verification Engine**: Multi-claim extraction, Google Fact Check Tools API integration, live web evidence search, and calibrated 5-tier verdicts.
7. 🔐 **Enterprise Security & Isolation**: Supabase Auth, PostgreSQL database, and Row Level Security (RLS) guaranteeing multi-tenant privacy.

---

## 📁 Repository Structure

```
Mini-Project/
├── backend/                     # Python Flask AI & Security Backend
│   ├── app/
│   │   ├── routes/              # API Endpoints (/api/analyze/multimodal, /api/chat/*, /api/url/*, /api/news/*, etc.)
│   │   ├── services/
│   │   │   ├── multimodal/      # Vision OCR & QR, Whisper transcription, Video pipeline, Regional NLP, Consensus Engine
│   │   │   ├── chatbot/         # TrustLens AI Assistant, emergency triage, credential guardrails
│   │   │   ├── url_security/    # Safe Browsing, VirusTotal, domain analyzer, RDAP, SSRF redirect tracing
│   │   │   ├── ai_router.py     # Multi-model routing (Groq, Gemini, Mistral)
│   │   │   └── supabase_service.py # PostgreSQL scan & chat persistence
│   │   └── utils/               # Response formatters and validators
│   ├── tests/                   # 65 automated unit & integration tests
│   ├── requirements.txt         # Flask, Flask-CORS, Pydantic, python-dotenv, requests, pillow
│   ├── .env.example             # Backend configuration template
│   └── run.py                   # Server entrypoint (Port 5000)
│
├── scam-or-safe/                # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Cyberpunk HUD components (RiskGauge, Navbar, Sidebar)
│   │   ├── pages/               # MultimodalAnalyzer, TrustLensChatbot, URLChecker, FakeNewsChecker, ScamScanner, etc.
│   │   ├── services/            # multimodalService, chatService, urlService, newsService, scamService
│   │   └── context/             # Supabase AuthContext & state management
│   ├── supabase/                # PostgreSQL schemas, migrations (Day 2, Day 4, Day 6), and RLS policies
│   └── package.json             # React 18, Vite, Tailwind CSS, Recharts, Lucide React
│
└── .gitignore                   # Universal gitignore protecting secrets & build artifacts
```

---

## ⚡ Quick Start

### 1. Backend Setup (Flask API)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Configure your API keys in backend/.env
# GEMINI_API_KEY=...
# GROQ_API_KEY=...
# MISTRAL_API_KEY=...
# GOOGLE_SAFE_BROWSING_API_KEY=...
# VIRUSTOTAL_API_KEY=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...

python run.py
# Backend runs on http://localhost:5000
```

### 2. Frontend Setup (React + Vite)

```bash
cd scam-or-safe
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Run Backend Test Suite

```bash
python -m unittest discover backend/tests
# Runs 65 tests covering Scam, News, URL Safety, Multimodal, and Chatbot
```
