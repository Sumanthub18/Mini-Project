-- ==============================================================================
-- DAY 6 MIGRATION: ADVANCED MULTIMODAL AI & CYBER SAFETY CHATBOT SCHEMA
-- Project: TrustLens AI – Unified Multimodal Digital Trust & Safety Platform
-- Description: Tables for chat conversations, messages, media uploads, and multimodal analyses with RLS.
-- ==============================================================================

-- 1. Table: chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Cyber Safety Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (lower(role) IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  model_used TEXT DEFAULT 'auto',
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: media_uploads
CREATE TABLE IF NOT EXISTS public.media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Table: multimodal_analyses
CREATE TABLE IF NOT EXISTS public.multimodal_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (lower(media_type) IN ('text', 'image', 'audio', 'video')),
  extracted_text TEXT,
  detected_language TEXT,
  qr_codes_found JSONB DEFAULT '[]'::jsonb,
  consensus_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON public.chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON public.media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_analyses_scan_id ON public.multimodal_analyses(scan_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_analyses_user_id ON public.multimodal_analyses(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multimodal_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: chat_conversations
DROP POLICY IF EXISTS "Users can read own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can read own chat conversations"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can insert own chat conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own chat conversations"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own chat conversations"
  ON public.chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: chat_messages
DROP POLICY IF EXISTS "Users can read own chat messages" ON public.chat_messages;
CREATE POLICY "Users can read own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: media_uploads
DROP POLICY IF EXISTS "Users can read own media uploads" ON public.media_uploads;
CREATE POLICY "Users can read own media uploads"
  ON public.media_uploads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own media uploads" ON public.media_uploads;
CREATE POLICY "Users can insert own media uploads"
  ON public.media_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own media uploads" ON public.media_uploads;
CREATE POLICY "Users can delete own media uploads"
  ON public.media_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: multimodal_analyses
DROP POLICY IF EXISTS "Users can read own multimodal analyses" ON public.multimodal_analyses;
CREATE POLICY "Users can read own multimodal analyses"
  ON public.multimodal_analyses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own multimodal analyses" ON public.multimodal_analyses;
CREATE POLICY "Users can insert own multimodal analyses"
  ON public.multimodal_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own multimodal analyses" ON public.multimodal_analyses;
CREATE POLICY "Users can delete own multimodal analyses"
  ON public.multimodal_analyses FOR DELETE
  USING (auth.uid() = user_id);
