-- ==============================================================================
-- DAY 4 MIGRATION: FAKE NEWS VERIFICATION ENGINE SCHEMA
-- Project: Scam or Safe? — AI-Powered Fake News Verification
-- Description: Structured news claims, citations, and evidence tables with RLS.
-- ==============================================================================

-- 1. Table: news_claims
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

-- 2. Table: news_evidence
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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_news_claims_scan_id ON public.news_claims(scan_id);
CREATE INDEX IF NOT EXISTS idx_news_claims_user_id ON public.news_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_news_claims_verdict ON public.news_claims(verdict);
CREATE INDEX IF NOT EXISTS idx_news_evidence_claim_id ON public.news_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_news_evidence_scan_id ON public.news_evidence(scan_id);

-- Row Level Security (RLS)
ALTER TABLE public.news_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_evidence ENABLE ROW LEVEL SECURITY;

-- news_claims Policies
DROP POLICY IF EXISTS "Users can read own news claims" ON public.news_claims;
CREATE POLICY "Users can read own news claims"
  ON public.news_claims FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own news claims" ON public.news_claims;
CREATE POLICY "Users can insert own news claims"
  ON public.news_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own news claims" ON public.news_claims;
CREATE POLICY "Users can delete own news claims"
  ON public.news_claims FOR DELETE
  USING (auth.uid() = user_id);

-- news_evidence Policies
DROP POLICY IF EXISTS "Users can read evidence of own news claims" ON public.news_evidence;
CREATE POLICY "Users can read evidence of own news claims"
  ON public.news_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = public.news_evidence.scan_id
      AND public.scans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert evidence for own news claims" ON public.news_evidence;
CREATE POLICY "Users can insert evidence for own news claims"
  ON public.news_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = public.news_evidence.scan_id
      AND public.scans.user_id = auth.uid()
    )
  );

