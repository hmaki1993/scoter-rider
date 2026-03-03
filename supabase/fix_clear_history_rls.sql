-- ============================================================
-- FIX: Add missing UPDATE policy for conversation_participants
-- This was blocking cleared_at and is_hidden from being saved
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add the missing UPDATE policy so users can update their own participation rows
-- (needed for: clear history, hide chat, mark as read, last_read_at updates)
CREATE POLICY "participants_update" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

SELECT 'participants_update RLS policy added successfully! ✅' AS status;
