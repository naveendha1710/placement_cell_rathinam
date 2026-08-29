-- Add offer_status column to offers table (Cold, Warm, Hot, Drive Completed)
-- Run this in Supabase SQL Editor

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_status TEXT DEFAULT 'cold' CHECK (offer_status IN ('cold','warm','hot','drive_completed'));
