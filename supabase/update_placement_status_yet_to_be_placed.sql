-- Migration: Change Placement Status 'unplaced' to 'yet_to_be_placed'
-- Run this script in your Supabase SQL Editor

-- 1. Drop existing placement status check constraint if present
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_placement_status_check;

-- 2. Update existing student records from 'unplaced' to 'yet_to_be_placed'
UPDATE public.students 
SET placement_status = 'yet_to_be_placed' 
WHERE placement_status = 'unplaced' OR placement_status IS NULL;

-- 3. Set default column value to 'yet_to_be_placed'
ALTER TABLE public.students 
ALTER COLUMN placement_status SET DEFAULT 'yet_to_be_placed';

-- 4. Re-add check constraint to enforce allowed placement status values
ALTER TABLE public.students 
ADD CONSTRAINT students_placement_status_check 
CHECK (placement_status IN ('yet_to_be_placed', 'placed', 'opted_out'));
