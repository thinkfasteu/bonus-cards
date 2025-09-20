-- Migration: Add email delivery tracking columns
-- Date: 2025-09-20
-- Description: Add attempts, last_error, and sent_at columns to email_receipts table for retry logic

-- Add attempts counter for retry logic
ALTER TABLE email_receipts 
ADD COLUMN attempts INT NOT NULL DEFAULT 0;

-- Add sent_at timestamp for successful deliveries
ALTER TABLE email_receipts 
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE NULL;

-- Add last_error field for failure tracking
ALTER TABLE email_receipts 
ADD COLUMN last_error TEXT NULL;

-- Add index for worker queries (fetch by status)
CREATE INDEX IF NOT EXISTS idx_email_receipts_status_created 
ON email_receipts(status, created_at);

-- Add index for admin queries (status filtering with pagination)
CREATE INDEX IF NOT EXISTS idx_email_receipts_status_id 
ON email_receipts(status, id);

-- Comments for documentation
COMMENT ON COLUMN email_receipts.attempts IS 'Number of delivery attempts made (0 = never attempted)';
COMMENT ON COLUMN email_receipts.sent_at IS 'UTC timestamp when successfully sent (NULL if not sent)';
COMMENT ON COLUMN email_receipts.last_error IS 'Error message from last failed delivery attempt';