# Scam or Safe? — Backend AI Detection & Verification Engine
### Day 3 & Day 4: Multi-Model AI Scam Detection & Fake News Verification

---

## 📋 Overview

The Python Flask backend provides comprehensive threat intelligence and fact-checking:
- **Groq API**: Ultra-fast classification, category mapping, and claim extraction.
- **Google Gemini API**: Contextual nuance, social engineering analysis, and behavioral insights.
- **Mistral AI API**: Multilingual threat understanding (English, Hindi, Kannada, code-mixed Hinglish).
- **Google Fact Check Tools API**: Automated querying of certified international and regional fact-checkers.
- **Live Evidence Search**: Web search integration prioritizing Government, Scientific, and Fact-Checking authorities.
- **Deterministic Rule Engine**: High-confidence regex pattern matcher across 13 scam categories.
- **Explainable Risk Scoring Engine**: Calibrated 0–100 threat score combining deterministic rules and AI evaluations without double-counting.
- **Transparent Verdict Engine**: Verdict categories (`SUPPORTED`, `CONTRADICTED`, `MIXED`, `UNVERIFIED`, `INSUFFICIENT EVIDENCE`) with confidence levels and next steps.
- **AI Model Comparison**: Parallel multi-model evaluation identifying Common, Unique, and Conflicting findings.

---

## ⚡ Quick Start

### 1. Requirements
- Python 3.10+
- Installed packages: `flask`, `flask-cors`, `pydantic`, `python-dotenv`, `requests`

### 2. Configure Environment (`backend/.env`)
Copy `.env.example` to `.env` and insert your API keys:
```env
PORT=5000
FLASK_ENV=development

# Optional AI API keys (system gracefully uses rule-engine fallback if keys are missing)
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key

# Configurable Model Identifiers
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_MODEL=gemini-1.5-flash
MISTRAL_MODEL=mistral-small-latest
```

### 3. Run Backend Server
```bash
cd backend
python run.py
```
Server runs at **http://localhost:5000**.

### 4. Run Automated Test Suite
```bash
cd backend
python -m unittest discover tests
```

---

## 🛡️ API Endpoints

### 1. Health Check
`GET /api/health`
Returns system status, active models, and provider readiness without leaking keys.

### 2. Provider Discovery
`GET /api/ai/providers`
Lists available AI providers, model IDs, roles, and feature specializations.

### 3. Scam Analysis
`POST /api/analyze/scam`
```json
{
  "message": "Your bank account has been suspended. Share OTP to unlock.",
  "provider": "auto",
  "include_contextual": false
}
```

### 4. Multi-Model Comparison
`POST /api/analyze/scam/compare`
```json
{
  "message": "Congratulations! You won Rs 25,00,000 in lucky draw. Pay 5000 processing fee.",
  "providers": ["groq", "gemini", "mistral"]
}
```

Returns individual provider outputs alongside synthesis:
- `common_findings`: Overlapping warning flags agreed by 2+ models.
- `unique_findings`: Special insights discovered by only 1 model.
- `conflicting_findings`: Risk level or scam category divergences.
- `consensus`: Overall agreement rating, category consensus, and synthesized score.

---

## 🔒 Security Architecture
- **Prompt Injection Defense**: Input messages are encapsulated inside strict untrusted delimiters (`<<<UNTRUSTED_MESSAGE_START>>>`). System instructions command models to ignore commands embedded in user input.
- **Zero Secrets on Client**: API keys for Groq, Gemini, and Mistral reside exclusively on the Flask backend.
- **Graceful Degradation**: If third-party APIs experience downtime, timeouts, or rate limits (429), the router falls back without crashing.

