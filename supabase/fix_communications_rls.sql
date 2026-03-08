-- ============================================================
-- COMMUNICATION SUITE - Complete RLS Policy Fix
-- Run this in Supabase SQL Editor
-- ============================================================

-- Fix 1: conversations SELECT policy
-- Allow SELECT if the user created the conversation OR is a participant
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Fix 2: conversations UPDATE policy
DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Fix 3: messages SELECT policy - allow sender and participants to read messages
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Fix 4: messages INSERT policy - allow participants to insert messages
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Fix 5: messages UPDATE policy - allow participants to update delivered_at/read_at
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    -- Sender can update their own messages (for delete/pin)
    sender_id = auth.uid()
    OR
    -- Participants can update delivery/read status
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Fix 6: conversation_participants SELECT policy
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants p2 WHERE p2.user_id = auth.uid()
    )
  );

-- Fix 7: conversation_participants UPDATE (for last_read_at, cleared_at)
DROP POLICY IF EXISTS "participants_update" ON conversation_participants;
CREATE POLICY "participants_update" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Fix 8: Enable RLS on messages/conversations if not already done
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_participants ENABLE ROW LEVEL SECURITY;

-- Fix 9: profiles SELECT - allow all authenticated users to see all profiles
-- This is the key fix for coach/admin not seeing each other
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

SELECT 'All RLS policies applied successfully! ✅' AS status;
