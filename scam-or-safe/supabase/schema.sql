-- ==============================================================================
-- SCAM OR SAFE? — DAY 2 COMPLETE DATABASE SCHEMA & RLS POLICIES
-- Copy and run this script directly in your Supabase SQL Editor (SQL Editor -> New Query)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Scans Table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (lower(scan_type) IN ('scam', 'news', 'url')),
  summary TEXT,
  risk_score INTEGER CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  risk_level TEXT CHECK (risk_level IS NULL OR lower(risk_level) IN ('low', 'medium', 'high')),
  result_status TEXT DEFAULT 'completed' CHECK (result_status IS NULL OR lower(result_status) IN ('completed', 'pending', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Scan Findings Table
CREATE TABLE IF NOT EXISTS public.scan_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IS NULL OR lower(severity) IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Evidence Sources Table
CREATE TABLE IF NOT EXISTS public.evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publisher TEXT,
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  evidence_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT feedback_scan_user_unique UNIQUE (scan_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_created ON public.scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_type ON public.scans(scan_type);
CREATE INDEX IF NOT EXISTS idx_scans_risk_level ON public.scans(risk_level);
CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_id ON public.scan_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sources_scan_id ON public.evidence_sources(scan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_scan_id ON public.feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- Auto Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name
  WHERE public.profiles.display_name IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile updated_at trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Scans Policies
DROP POLICY IF EXISTS "Users can read own scans" ON public.scans;
CREATE POLICY "Users can read own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;
CREATE POLICY "Users can insert own scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scans" ON public.scans;
CREATE POLICY "Users can update own scans" ON public.scans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own scans" ON public.scans;
CREATE POLICY "Users can delete own scans" ON public.scans FOR DELETE USING (auth.uid() = user_id);

-- Scan Findings Policies
DROP POLICY IF EXISTS "Users can read findings of own scans" ON public.scan_findings;
CREATE POLICY "Users can read findings of own scans" ON public.scan_findings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.scan_findings.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert findings for own scans" ON public.scan_findings;
CREATE POLICY "Users can insert findings for own scans" ON public.scan_findings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.scan_findings.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update findings for own scans" ON public.scan_findings;
CREATE POLICY "Users can update findings for own scans" ON public.scan_findings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.scan_findings.scan_id AND public.scans.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.scan_findings.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete findings of own scans" ON public.scan_findings;
CREATE POLICY "Users can delete findings of own scans" ON public.scan_findings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.scan_findings.scan_id AND public.scans.user_id = auth.uid()));

-- Evidence Sources Policies
DROP POLICY IF EXISTS "Users can read evidence of own scans" ON public.evidence_sources;
CREATE POLICY "Users can read evidence of own scans" ON public.evidence_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.evidence_sources.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert evidence for own scans" ON public.evidence_sources;
CREATE POLICY "Users can insert evidence for own scans" ON public.evidence_sources FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.evidence_sources.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update evidence for own scans" ON public.evidence_sources;
CREATE POLICY "Users can update evidence for own scans" ON public.evidence_sources FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.evidence_sources.scan_id AND public.scans.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.evidence_sources.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete evidence of own scans" ON public.evidence_sources;
CREATE POLICY "Users can delete evidence of own scans" ON public.evidence_sources FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.evidence_sources.scan_id AND public.scans.user_id = auth.uid()));

-- Feedback Policies
DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
CREATE POLICY "Users can read own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.feedback.scan_id AND public.scans.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback" ON public.feedback FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;
CREATE POLICY "Users can delete own feedback" ON public.feedback FOR DELETE USING (auth.uid() = user_id);


-- ==============================================================================
-- DAY 4 ADDITIONS: NEWS CLAIMS & EVIDENCE TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.news_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  subject TEXT,
  category TEXT,
  verdict TEXT NOT NULL CHECK (lower(verdict) IN ('supported', 'contradicted', 'mixed', 'unverified', 'insufficient evidence')),
  confidence TEXT CHECK (lower(confidence) IN ('low', 'medium', 'high')),
  explanation TEXT,
  provider_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.news_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.news_claims(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publisher TEXT,
  source_url TEXT NOT NULL,
  evidence_type TEXT CHECK (lower(evidence_type) IN ('supporting', 'contradicting', 'contextual', 'fact_check')),
  publisher_rating TEXT,
  published_at TIMESTAMPTZ,
  evidence_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_news_claims_scan_id ON public.news_claims(scan_id);
CREATE INDEX IF NOT EXISTS idx_news_claims_user_id ON public.news_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_news_evidence_claim_id ON public.news_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_news_evidence_scan_id ON public.news_evidence(scan_id);

ALTER TABLE public.news_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own news claims" ON public.news_claims;
CREATE POLICY "Users can read own news claims" ON public.news_claims FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own news claims" ON public.news_claims;
CREATE POLICY "Users can insert own news claims" ON public.news_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own news claims" ON public.news_claims;
CREATE POLICY "Users can delete own news claims" ON public.news_claims FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read evidence of own news claims" ON public.news_evidence;
CREATE POLICY "Users can read evidence of own news claims" ON public.news_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.news_evidence.scan_id AND public.scans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert evidence for own news claims" ON public.news_evidence;
CREATE POLICY "Users can insert evidence for own news claims" ON public.news_evidence FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans WHERE public.scans.id = public.news_evidence.scan_id AND public.scans.user_id = auth.uid()));
