-- Migration: Add stage_history jsonb column to public.offers for audit trail tracking
-- Run this script in your Supabase SQL Editor

ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS stage_history jsonb DEFAULT '[]'::jsonb;
