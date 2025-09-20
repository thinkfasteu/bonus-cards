import { Pool } from 'pg';
import { pool } from '../db';
import { sendDeductionReceipt, validateReceiptPayload } from '../mailer/sendReceipt';
import { closeTransport } from '../mailer/transport';
import type { ReceiptPayload } from '../mailer/sendReceipt';

/**
 * Email Worker for FTG Sportfabrik Digital Bonus Cards
 * 
 * Background worker that processes queued email receipts with retry logic.
 * Supports graceful shutdown and configurable concurrency.
 */

interface EmailReceiptRow {
  id: number;
  card_id: string;
  event_id: number;
  to_email: string;
  status: string;
  attempts: number;
  sent_at: Date | null;
  last_error: string | null;
  created_at: Date;
}

interface WorkerConfig {
  batchSize: number;
  concurrency: number;
  maxRetries: number;
  retryBackoffMs: number;
  pollIntervalMs: number;
}

/**
 * Load worker configuration from environment variables
 */
function loadWorkerConfig(): WorkerConfig {
  return {
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '10', 10),
    concurrency: parseInt(process.env.EMAIL_SEND_CONCURRENCY || '2', 10),
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.EMAIL_RETRY_BACKOFF_MS || '60000', 10), // 1 minute
    pollIntervalMs: parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '30000', 10)  // 30 seconds
  };
}

/**
 * Email Worker class
 */
export class EmailWorker {
  private db: Pool;
  private config: WorkerConfig;
  private running: boolean = false;
  private processPromise: Promise<void> | null = null;

  constructor(db?: Pool, config?: Partial<WorkerConfig>) {
    this.db = db || pool;
    this.config = { ...loadWorkerConfig(), ...config };
    
    console.log('📧 Email Worker initialized:', {
      batchSize: this.config.batchSize,
      concurrency: this.config.concurrency,
      maxRetries: this.config.maxRetries,
      retryBackoffMs: this.config.retryBackoffMs,
      pollIntervalMs: this.config.pollIntervalMs
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('📧 Email Worker already running');
      return;
    }

    this.running = true;
    console.log('📧 Email Worker starting...');

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    // Start the main processing loop
    this.processPromise = this.processLoop();
    
    try {
      await this.processPromise;
    } catch (error) {
      console.error('📧 Email Worker error:', error);
    } finally {
      console.log('📧 Email Worker stopped');
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log('📧 Email Worker stopping...');
    this.running = false;

    // Wait for current processing to complete
    if (this.processPromise) {
      await this.processPromise;
    }

    // Close email transport
    closeTransport();
    
    console.log('📧 Email Worker stopped gracefully');
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupShutdownHandlers(): void {
    const shutdown = () => {
      console.log('📧 Received shutdown signal');
      this.stop().catch(console.error);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.processBatch();
        
        // Wait before next poll (only if still running)
        if (this.running) {
          await this.sleep(this.config.pollIntervalMs);
        }
      } catch (error) {
        console.error('📧 Error in worker loop:', error);
        
        // Wait longer on error before retrying
        if (this.running) {
          await this.sleep(Math.min(this.config.pollIntervalMs * 2, 60000));
        }
      }
    }
  }

  /**
   * Process a batch of queued emails
   */
  private async processBatch(): Promise<void> {
    // Fetch queued emails with row-level locking
    const queuedEmails = await this.fetchQueuedEmails();
    
    if (queuedEmails.length === 0) {
      return; // No work to do
    }

    console.log(`📧 Processing batch of ${queuedEmails.length} queued emails`);

    // Process emails with concurrency control
    const promises = queuedEmails.map(email => this.processEmail(email));
    await this.runWithConcurrency(promises, this.config.concurrency);
  }

  /**
   * Fetch queued emails using row-level locking with card/event data
   */
  private async fetchQueuedEmails(): Promise<EmailReceiptRow[]> {
    const query = `
      SELECT 
        er.id, er.card_id, er.event_id, er.to_email, er.status, er.attempts,
        er.sent_at, er.last_error, er.created_at
      FROM email_receipts er
      WHERE er.status = 'Queued'
      ORDER BY er.created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `;

    const result = await this.db.query(query, [this.config.batchSize]);
    return result.rows;
  }

  /**
   * Get card and event details for email generation
   */
  private async getEmailData(cardId: string, eventId: number): Promise<{
    memberDisplayName: string;
    memberEmail: string;
    productLabel: string;
    serial: string;
    eventTimeUTC: Date;
    remainingUses: number | null;
    expiresAtUTC: Date;
  } | null> {
    const query = `
      SELECT 
        c.serial,
        c.product,
        c.remaining_uses,
        c.expires_at,
        m.display_name as member_display_name,
        m.email as member_email,
        e.created_at as event_time_utc
      FROM cards c
      JOIN members m ON c.member_id = m.id
      JOIN events e ON e.card_id = c.id AND e.id = $2
      WHERE c.id = $1
    `;

    const result = await this.db.query(query, [cardId, eventId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Convert product to label
    const productLabel = row.product === 'cycling_bonus' ? 'Radsport Bonus' : 'Radsport Unlimited';
    
    return {
      memberDisplayName: row.member_display_name,
      memberEmail: row.member_email,
      productLabel,
      serial: row.serial,
      eventTimeUTC: row.event_time_utc,
      remainingUses: row.remaining_uses,
      expiresAtUTC: row.expires_at
    };
  }

  /**
   * Process a single email
   */
  private async processEmail(email: EmailReceiptRow): Promise<void> {
    try {
      // Get card and event data
      const emailData = await this.getEmailData(email.card_id, email.event_id);
      
      if (!emailData) {
        throw new Error(`Card or event data not found for card_id: ${email.card_id}, event_id: ${email.event_id}`);
      }

      // Convert to receipt payload
      const payload: ReceiptPayload = {
        memberDisplayName: emailData.memberDisplayName,
        productLabel: emailData.productLabel,
        serial: emailData.serial,
        eventTimeUTC: emailData.eventTimeUTC,
        remainingUses: emailData.remainingUses,
        expiresAtUTC: emailData.expiresAtUTC
      };

      // Validate payload
      const validation = validateReceiptPayload(payload);
      if (!validation.valid) {
        throw new Error(`Invalid receipt payload: ${validation.errors.join(', ')}`);
      }

      // Attempt to send email
      const result = await sendDeductionReceipt({
        to: email.to_email,
        locale: 'de',
        payload
      });

      if (result.success) {
        // Mark as sent
        await this.markEmailSent(email.id, result.messageId);
        console.log(`📧 ✅ Email ${email.id} sent successfully (messageId: ${result.messageId})`);
      } else {
        // Handle send failure
        await this.handleEmailFailure(email, result.error || 'Unknown send error');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      await this.handleEmailFailure(email, errorMessage);
    }
  }

  /**
   * Mark email as successfully sent
   */
  private async markEmailSent(emailId: number, messageId: string): Promise<void> {
    const query = `
      UPDATE email_receipts 
      SET status = 'Sent', 
          sent_at = NOW(),
          message_id = $2
      WHERE id = $1
    `;

    await this.db.query(query, [emailId, messageId]);
  }

  /**
   * Handle email sending failure with retry logic
   */
  private async handleEmailFailure(email: EmailReceiptRow, errorMessage: string): Promise<void> {
    const newAttempts = email.attempts + 1;
    const shouldRetry = newAttempts < this.config.maxRetries;

    if (shouldRetry) {
      // Update attempts and error, keep status as 'Queued'
      const query = `
        UPDATE email_receipts 
        SET attempts = $2, 
            last_error = $3,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.db.query(query, [email.id, newAttempts, errorMessage]);
      
      console.log(`📧 ⚠️ Email ${email.id} failed (attempt ${newAttempts}/${this.config.maxRetries}): ${errorMessage}`);
      
      // Wait before allowing retry (simple backoff)
      if (this.config.retryBackoffMs > 0) {
        await this.sleep(this.config.retryBackoffMs);
      }
      
    } else {
      // Mark as permanently failed
      const query = `
        UPDATE email_receipts 
        SET status = 'Failed', 
            attempts = $2, 
            last_error = $3,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.db.query(query, [email.id, newAttempts, errorMessage]);
      
      console.log(`📧 ❌ Email ${email.id} permanently failed after ${newAttempts} attempts: ${errorMessage}`);
    }
  }

  /**
   * Run promises with concurrency control
   */
  private async runWithConcurrency<T>(promises: Promise<T>[], concurrency: number): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch);
      
      // Log any rejected promises but continue processing
      batchResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`📧 Promise ${i + index} rejected:`, result.reason);
        } else {
          results.push(result.value);
        }
      });
    }
    
    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<{
    queuedCount: number;
    sentCount: number;
    failedCount: number;
    totalCount: number;
  }> {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM email_receipts 
      GROUP BY status
    `;

    const result = await this.db.query(query);
    const stats = {
      queuedCount: 0,
      sentCount: 0,
      failedCount: 0,
      totalCount: 0
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      stats.totalCount += count;

      switch (row.status) {
        case 'Queued':
          stats.queuedCount = count;
          break;
        case 'Sent':
          stats.sentCount = count;
          break;
        case 'Failed':
          stats.failedCount = count;
          break;
      }
    });

    return stats;
  }
}

/**
 * Main entry point when run as a script
 */
if (require.main === module) {
  const worker = new EmailWorker();
  
  worker.start().catch(error => {
    console.error('📧 Failed to start email worker:', error);
    process.exit(1);
  });
}