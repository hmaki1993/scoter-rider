-- ============================================================
-- NUCLEAR RLS RESET v2 — Run this in Supabase SQL Editor
-- Fixes the recursion bug from the previous version
-- ============================================================

-- Step 1: Drop ALL existing policies cleanly
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('conversations','conversation_participants','messages','call_records','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Step 2: Create a SECURITY DEFINER helper function
-- This avoids infinite recursion when a table's policy references itself
CREATE OR REPLACE FUNCTION public.is_conversation_member(convo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = convo_id
    AND user_id = auth.uid()
  );
END;
$$;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ─── CONVERSATIONS ────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Use the function to avoid recursion
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.is_conversation_member(id)
  );

-- ANY participant can update (needed for updated_at after non-creator sends)
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (public.is_conversation_member(id));

-- ─── CONVERSATION PARTICIPANTS ────────────────────────────────────────────────
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Simplified: each user can see their own rows
-- OR use function for other participants (no self-recursion)
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );

CREATE POLICY "participants_update" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id)
  );

-- ANY participant can update (for delivered_at, read_at, pin, soft-delete)
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- ─── CALL RECORDS ─────────────────────────────────────────────────────────────
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_select" ON call_records
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY "calls_insert" ON call_records
  FOR INSERT WITH CHECK (caller_id = auth.uid());

CREATE POLICY "calls_update" ON call_records
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE call_records; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Nuclear RLS Reset v2 complete — no more recursion! ✅' AS status;
