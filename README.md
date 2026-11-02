# Scam or Safe? — AI-Powered Cybersecurity & Fact-Checking Platform

> **Think Before You Click. Verify Before You Believe.**

**Scam or Safe?** is an end-to-end cybersecurity awareness and threat intelligence platform designed to protect users against digital deception:
1. 📩 **Scam Message Detection**: Detects banking fraud, UPI phishing, OTP theft, and social engineering using Groq (`llama-3.3-70b-versatile` / `openai/gpt-oss-120b`), Google Gemini, Mistral AI, and a 13-category deterministic rule engine.
2. 📰 **Fake News Verification Engine**: Multi-claim extraction, Google Fact Check Tools API integration, live web evidence search, and calibrated 5-tier verdicts (`SUPPORTED`, `CONTRADICTED`, `MIXED`, `UNVERIFIED`, `INSUFFICIENT EVIDENCE`).
3. 🤖 **AI Model Comparison**: Side-by-side ensemble comparison of Groq, Gemini, and Mistral with consensus scoring and conflict analysis.
4. 🔐 **Enterprise Security & Isolation**: Supabase Auth, PostgreSQL database, and Row Level Security (RLS) guaranteeing multi-tenant privacy.

---

## 📁 Repository Structure

```
Mini-Project/
├── backend/                     # Python Flask AI & Fact-Checking Backend
│   ├── app/
│   │   ├── routes/              # API Endpoints (/api/analyze/scam, /api/news/analyze, etc.)
│   │   ├── services/            # AI router, Groq, Gemini, Mistral, FactCheck, Evidence Search
│   │   └── utils/               # Validators, source tiering & response formatters
│   ├── tests/                   # 28 automated unit & integration tests
│   ├── requirements.txt         # Flask, Flask-CORS, Pydantic, python-dotenv, requests
│   ├── .env.example             # Backend configuration template
│   └── run.py                   # Server entrypoint (Port 5000)
│
├── scam-or-safe/                # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Cyberpunk HUD components (RiskGauge, Navbar, Sidebar)
│   │   ├── context/             # Supabase AuthContext & state management
│   │   ├── hooks/               # useScanHistory, useToast
│   │   ├── pages/               # Dashboard, ScamScanner, FakeNewsChecker, ModelComparison, etc.
│   │   └── services/            # API integration modules
│   ├── supabase/                # PostgreSQL schemas, migrations, and RLS policies
│   ├── tests/                   # 18 frontend & RLS isolation tests
│   ├── .env.example             # Frontend configuration template
│   └── package.json             # React 18, Vite, Tailwind CSS, Recharts, Lucide React
│
└── .gitignore                   # Universal gitignore protecting secrets & build artifacts
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- Free **Supabase** account (for Auth & Database)
- **Groq API key** (or Google Gemini / Mistral API key)

### 2. Backend Setup (Flask API)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY, GEMINI_API_KEY, and SUPABASE_URL

# Run unit tests
python -m unittest discover tests

# Start backend server (Port 5000)
python run.py
```

### 3. Frontend Setup (React Application)
```bash
cd scam-or-safe

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Run tests
npm test

# Start frontend development server (Port 5173)
npm run dev
```

---

## 🧪 Testing Summary

- **Backend Test Suite**: 28 tests passing (`python -m unittest discover tests`)
- **Frontend & RLS Test Suite**: 18 tests passing (`npm test`)
- **Total**: 46 automated tests across authentication, multi-tenant isolation, scam detection, claim extraction, and verdict synthesis.

---

## 🛡️ Security
- **Zero Client Secrets**: All AI API keys (Groq, Gemini, Mistral) reside strictly on the Flask backend.
- **Row Level Security**: Database queries enforce `auth.uid() = user_id` for multi-tenant isolation.
- **Prompt Injection Defense**: Submissions are framed as untrusted payloads to prevent model manipulation.
