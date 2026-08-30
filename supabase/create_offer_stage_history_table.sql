-- Migration: Create relational offer_stage_history table for stage audit logs
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.offer_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('cold', 'warm', 'hot', 'drive_completed')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast retrieval by offer_id ordered by timestamp
CREATE INDEX IF NOT EXISTS idx_offer_stage_history_offer_id ON public.offer_stage_history(offer_id, timestamp ASC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.offer_stage_history ENABLE ROW LEVEL SECURITY;

-- Safely drop and recreate policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Allow authenticated read for offer_stage_history" ON public.offer_stage_history;
CREATE POLICY "Allow authenticated read for offer_stage_history"
ON public.offer_stage_history FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert for offer_stage_history" ON public.offer_stage_history;
CREATE POLICY "Allow authenticated insert for offer_stage_history"
ON public.offer_stage_history FOR INSERT
TO authenticated
WITH CHECK (true);
