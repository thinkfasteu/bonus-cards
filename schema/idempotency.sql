-- Idempotency log table to prevent duplicate operations
CREATE TABLE IF NOT EXISTS idempotency_log (
  key VARCHAR(255) PRIMARY KEY,
  card_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for cleanup operations (remove old entries)
CREATE INDEX IF NOT EXISTS idx_idempotency_log_created_at ON idempotency_log(created_at);

-- Add foreign key constraint if cards table exists
-- ALTER TABLE idempotency_log ADD CONSTRAINT fk_idempotency_card 
-- FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;