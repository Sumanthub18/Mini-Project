-- Migration: Community Intelligence Reports Table & RLS
-- Apply this in Supabase SQL Editor to enable shared community threat reporting.

CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('scam', 'phishing_url', 'fake_news', 'upi_fraud', 'job_scam', 'other')),
    target_identifier TEXT NOT NULL,
    summary TEXT NOT NULL,
    reported_risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (reported_risk_level IN ('low', 'medium', 'high')),
    verification_status TEXT NOT NULL DEFAULT 'community_submitted' CHECK (verification_status IN ('community_submitted', 'under_review', 'verified')),
    upvotes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read community reports
CREATE POLICY "Authenticated users can view community reports"
ON public.community_reports FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can submit reports under their own user_id
CREATE POLICY "Users can create community reports"
ON public.community_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own reports
CREATE POLICY "Users can delete own community reports"
ON public.community_reports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_reports_created ON public.community_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_category ON public.community_reports(category);

