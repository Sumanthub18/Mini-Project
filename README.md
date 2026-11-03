# Scam or Safe? — AI-Powered Cybersecurity & Threat Intelligence Platform

> **Think Before You Click. Verify Before You Believe.**

**Scam or Safe?** is an end-to-end cybersecurity awareness and threat intelligence platform designed to protect users against digital deception:
1. 📩 **Scam Message Detection**: Detects banking fraud, UPI phishing, OTP theft, and social engineering using Groq (`llama-3.3-70b-versatile`), Google Gemini (`gemini-3.5-flash-lite`), Mistral AI, and a 13-category deterministic rule engine.
2. 📰 **Fake News Verification Engine**: Multi-claim extraction, Google Fact Check Tools API integration, live web evidence search, and calibrated 5-tier verdicts (`SUPPORTED`, `CONTRADICTED`, `MIXED`, `UNVERIFIED`, `INSUFFICIENT EVIDENCE`).
3. 🔗 **Local URL Safety & Pattern Engine**: High-speed detection of phishing URLs, lookalike typosquatting domains, brand impersonation, punycode/IDN attacks, direct IP hosts, transport security checks (HTTPS vs HTTP), social engineering keywords (`login`, `verify`, `update`, `reward`, `claim`), IANA RDAP domain age calculation, and safe HTTP redirect tracing with strict SSRF & private IP defenses — **with zero external URL reputation API dependencies**.
4. 🤖 **AI Model Comparison**: Side-by-side ensemble comparison of Groq, Gemini, and Mistral with consensus scoring and conflict analysis.
5. 🔐 **Enterprise Security & Isolation**: Supabase Auth, PostgreSQL database, and Row Level Security (RLS) guaranteeing multi-tenant privacy.

---

## 📁 Repository Structure

```
Mini-Project/
├── backend/                     # Python Flask AI & Security Backend
│   ├── app/
│   │   ├── routes/              # API Endpoints (/api/url/*, /api/news/*, /api/analyze/scam, etc.)
│   │   ├── services/
│   │   │   ├── url_security/    # Local domain analyzer, protocol inspector, RDAP, SSRF redirect tracing
│   │   │   ├── ai_router.py     # Multi-model routing (Groq, Gemini, Mistral)
│   │   │   ├── news_analyzer.py # Fact-checking & live evidence pipeline
│   │   │   └── supabase_service.py # PostgreSQL scan persistence
│   │   └── utils/               # Validators, source tiering & response formatters
│   ├── tests/                   # 48 automated unit & integration tests
│   ├── requirements.txt         # Flask, Flask-CORS, Pydantic, python-dotenv, requests
│   ├── .env.example             # Backend configuration template
│   └── run.py                   # Server entrypoint (Port 5000)
│
├── scam-or-safe/                # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Cyberpunk HUD components (RiskGauge, Navbar, Sidebar)
│   │   ├── context/             # Supabase AuthContext & state management
│   │   ├── hooks/               # useScanHistory, useToast
│   │   ├── pages/               # URLChecker, FakeNewsChecker, ScamScanner, ModelComparison, etc.
│   │   └── services/            # urlService, newsService, scamService, scanDatabaseService
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
- Optional AI API keys: Groq or Google Gemini (for explanation generation)
- **Zero URL API keys required**: No Google Safe Browsing or VirusTotal keys needed.

### 2. Backend Setup (Flask API)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY, GROQ_API_KEY, and SUPABASE_URL

# Run unit tests (48 tests)
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

## 🔗 Local URL Safety API Endpoints

- `GET /api/url/health` — Readiness status of local inspection engine, RDAP, and SSRF modules.
- `POST /api/url/analyze` — Full local inspection pipeline (protocol verification, domain heuristics, keywords, RDAP age, redirect hops, risk scoring, AI explanation).
- `POST /api/url/check-reputation` — Rapid local reputation & structural check.
- `GET /api/url/history` — Authenticated history of previous URL scans.
- `POST /api/url/report` — User false-positive / false-negative reporting.

---

## 🧪 Testing Summary

- **Backend Test Suite**: 48 tests passing (`python -m unittest discover backend/tests`)
  - 20 Local URL Safety & SSRF tests (protocol check, keywords, typosquatting, banking lures, SSRF defense, punycode, redirects, clean verification, zero API key requirement)
  - 14 Fake News & Evidence tests
  - 14 Scam Detection & Multi-Model routing tests
- **Frontend & RLS Test Suite**: 18 tests passing (`npm test`)
- **Total**: 66 automated tests across authentication, multi-tenant isolation, scam detection, news verification, and local URL threat intelligence.

---

## 🛡️ Security
- **Strict SSRF Defense**: All URL inspections resolve DNS and pre-flight check resolved IP addresses against private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`), link-local addresses, and cloud metadata (`169.254.169.254`, `metadata.google.internal`).
- **No Client Execution**: Redirect analysis traces HTTP headers without executing scripts or downloading payloads.
- **Zero Client Secrets**: All AI API keys reside strictly on the backend.
- **Row Level Security**: Database queries enforce `auth.uid() = user_id` for multi-tenant isolation.
- **Transparent Boundaries**: Clearly displays that external malware/phishing blacklist database checks are unavailable and never falsely claims a URL is 100% safe.
