-- ============================================================
-- FIX: Enable full row data on Realtime UPDATE events
-- This is REQUIRED for read_at/delivered_at tick changes to work
-- Run in Supabase SQL Editor
-- ============================================================

-- Without REPLICA IDENTITY FULL, Supabase Realtime UPDATE events
-- only contain the primary key — not the changed columns.
-- This means the sender never sees the read_at/delivered_at changes.

ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;

-- Make sure tables are in the realtime publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

SELECT 'REPLICA IDENTITY FULL enabled — ticks will now update in real time ✅' AS status;
