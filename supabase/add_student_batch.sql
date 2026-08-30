-- Migration: Add batch column (T, O, S, A, X) to students table and randomly shuffle existing students
-- Run this script in your Supabase SQL Editor

-- 1. Add batch column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS batch text DEFAULT 'A';

-- 2. Randomly shuffle batches (T, O, S, A, X) per row across ALL existing students
UPDATE public.students 
SET batch = CASE floor(random() * 5)::int
  WHEN 0 THEN 'T'
  WHEN 1 THEN 'O'
  WHEN 2 THEN 'S'
  WHEN 3 THEN 'A'
  ELSE 'X'
END;

-- 3. Add check constraint to enforce allowed batch values
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_batch_check;

ALTER TABLE public.students 
ADD CONSTRAINT students_batch_check 
CHECK (batch IN ('T', 'O', 'S', 'A', 'X'));
