-- ==============================================================================
-- UPDATE OFFERS & STAGE HISTORY CHECK CONSTRAINTS TO SUPPORT 'drive_closed'
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Drop old constraint on public.offers
ALTER TABLE public.offers 
DROP CONSTRAINT IF EXISTS offers_offer_status_check;

-- 2. Add updated check constraint to public.offers including 'drive_closed'
ALTER TABLE public.offers 
ADD CONSTRAINT offers_offer_status_check 
CHECK (offer_status IN ('cold', 'warm', 'hot', 'drive_completed', 'drive_closed'));

-- 3. Drop old constraint on public.offer_stage_history if exists
ALTER TABLE public.offer_stage_history 
DROP CONSTRAINT IF EXISTS offer_stage_history_stage_check;

-- 4. Add updated check constraint to public.offer_stage_history including 'drive_closed'
ALTER TABLE public.offer_stage_history 
ADD CONSTRAINT offer_stage_history_stage_check 
CHECK (stage IN ('cold', 'warm', 'hot', 'drive_completed', 'drive_closed'));
