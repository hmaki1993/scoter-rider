-- Add delivered_at and read_at columns to messages table
ALTER TABLE IF EXISTS public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add index for better performance on status updates
CREATE INDEX IF NOT EXISTS idx_messages_status_lookup 
ON public.messages (conversation_id, sender_id, read_at) 
WHERE read_at IS NULL;
