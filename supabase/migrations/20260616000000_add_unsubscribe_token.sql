ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS alerts_enabled boolean DEFAULT true NOT NULL;

-- Unique index for O(1) token lookups on unsubscribe
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_unsubscribe_token_idx
  ON subscribers (unsubscribe_token);
