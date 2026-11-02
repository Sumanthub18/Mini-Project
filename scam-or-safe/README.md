# Scam or Safe? — AI-Powered Detection Platform
### Day 3: Multi-Model AI Scam Detection & Model Comparison

> **Think Before You Click. Verify Before You Believe.**

---

## 📋 Overview

**Scam or Safe?** is a cybersecurity awareness platform that helps users identify:
- 📩 **Scam messages** — SMS, WhatsApp, emails, job offer scams
- 📰 **Fake news** — viral claims, misleading headlines, misinformation
- 🔗 **Unsafe URLs** — phishing links, typosquatting, suspicious domains

- **Day 1**: Cyberpunk HUD React Frontend.
- **Day 2**: Supabase Auth, PostgreSQL database, and Row Level Security (RLS).
- **Day 3**: Multi-Model AI Scam Detection Engine (Groq, Google Gemini, Mistral AI, Rule Engine, and Ensemble Model Comparison).
- **Day 4**: AI-Powered Fake News Verification Engine (Google Fact Check Tools API, Claim Extraction, Live Evidence Search, and Multi-Claim Verdicts).

---

## ⚡ Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js** 18+ and **npm** 9+
- A free [Supabase](https://supabase.com) account

### 2. Creating Your Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Choose an organization, enter a project name (e.g., `scam-or-safe`), set a strong database password, and select your preferred region.
4. Click **Create new project** and wait ~2 minutes for provisioning to finish.

### 3. Obtaining Project URL & Publishable API Key
1. In your Supabase Project Dashboard, navigate to **Project Settings** (gear icon) -> **API**.
2. Copy the **Project URL** (`https://<project-id>.supabase.co`).
3. Under **Project API keys**, copy the **anon** / **publishable** key.
   > ⚠️ **NEVER** copy or expose the `service_role` secret key in the frontend.

### 4. Configuring Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
   ```
   > 💡 *Note: If credentials are not yet configured, the platform safely runs in Standalone Sandbox mode without crashing.*

### 5. Running Database Migrations
1. In your Supabase dashboard, click **SQL Editor** from the left navigation.
2. Click **New query**.
3. Copy the entire contents of [`supabase/schema.sql`](file:///c:/Users/ADMIN/OneDrive/%E6%96%87%E6%A1%A3/Desktop/Mini%20Project/scam-or-safe/supabase/schema.sql) and paste into the editor.
4. Click **Run**.
5. All 5 tables (`profiles`, `scans`, `scan_findings`, `evidence_sources`, `feedback`), triggers, indexes, and RLS policies will be created.

### 6. Install & Start Application
```bash
# Navigate to the project directory
cd scam-or-safe

# Install dependencies (including @supabase/supabase-js)
npm install

# Run the Day 2 automated test suite
npm test

# Start the development server
npm run dev
```

App URL: **http://localhost:5173**

---

## 🛡️ Database Schema & Architecture

| Table | Primary Key | Foreign Key | Purpose |
|---|---|---|---|
| `profiles` | `id (UUID)` | `auth.users(id)` ON DELETE CASCADE | Display names, operator identities, timestamps |
| `scans` | `id (UUID)` | `auth.users(id)` ON DELETE CASCADE | Scan type (`scam`, `news`, `url`), summary, risk score, risk level, status |
| `scan_findings` | `id (UUID)` | `scans(id)` ON DELETE CASCADE | Identified red flags, phishing patterns, severity |
| `evidence_sources` | `id (UUID)` | `scans(id)` ON DELETE CASCADE | Fact-check citations, publisher, source URLs |
| `feedback` | `id (UUID)` | `scans(id)`, `auth.users(id)` | Operator ratings (1-5) and feedback notes |

### Triggers & Automation
- **`handle_new_user()`**: An `AFTER INSERT` trigger on `auth.users` automatically provisions a matching row in `public.profiles` whenever an operator signs up.
- **`set_current_timestamp_updated_at()`**: Updates `updated_at` timestamp on profile edits.

---

## 🔒 Row Level Security (RLS) & Multi-Tenant Isolation

Row Level Security is enabled on **every** user-accessible table:

1. **`profiles`**:
   - `SELECT`: `auth.uid() = id`
   - `UPDATE`: `auth.uid() = id`
   - `INSERT`: `auth.uid() = id`
2. **`scans`**:
   - `SELECT`: `auth.uid() = user_id`
   - `INSERT`: `auth.uid() = user_id`
   - `UPDATE`: `auth.uid() = user_id`
   - `DELETE`: `auth.uid() = user_id`
3. **`scan_findings` & `evidence_sources`**:
   - Only accessible through parent scans owned by the authenticated caller:
     ```sql
     EXISTS (
       SELECT 1 FROM public.scans
       WHERE public.scans.id = scan_id AND public.scans.user_id = auth.uid()
     )
     ```
4. **`feedback`**:
   - Can only be submitted and viewed by the owner for scans they own (`auth.uid() = user_id`).

### How to Test Isolation Between Two Test Accounts
1. In `http://localhost:5173/register`, create **Account 1** (`user1@test.com`).
2. Run 2 scans (e.g., Scam Scanner and URL Checker). Verify they appear on the Dashboard and Scan History.
3. Sign out.
4. Register **Account 2** (`user2@test.com`).
5. Notice that the Dashboard statistics start completely at **0** and the Scan History is completely **empty**.
6. Even if request parameters are tampered with, PostgreSQL rejects any foreign access at the database engine level via `auth.uid()`.

---

## 🧪 Automated Testing

Run the automated integration test suite:
```bash
npm test
```

Verifies:
- Environment variable configuration and graceful fallback.
- SQL table schemas, foreign key cascades, and constraints.
- RLS policy clauses across all operations (SELECT, INSERT, UPDATE, DELETE).
- Multi-tenant tenant isolation verification.
- Dashboard metric aggregation (ignoring failed or pending scans).
- Client credential security (no raw passwords in storage).

---

## 🔐 Security Checklist

- [x] **No privileged secrets exposed**: Service-role keys and database passwords are never placed in frontend code.
- [x] **No plaintext password storage**: Passwords are handled exclusively by Supabase Auth (Argon2/bcrypt) and never stored in application database or browser `localStorage`.
- [x] **RLS on all tables**: Row Level Security is active on `profiles`, `scans`, `scan_findings`, `evidence_sources`, and `feedback`.
- [x] **Enclave protection**: Dashboard, Scanners, Scan History, and Settings routes are guarded by `ProtectedRoute`.
- [x] **Session persistence**: Supabase session tokens persist across reloads with automated token refresh.
- [x] **Safe input handling**: Scan summaries truncate and avoid storing raw sensitive credentials or confidential messages.
