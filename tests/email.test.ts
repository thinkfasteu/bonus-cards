import { sendDeductionReceipt, validateReceiptPayload } from '../src/mailer/sendReceipt';
import { createSMTPTransport, healthCheckSMTP } from '../src/mailer/transport';
import { EmailWorker } from '../src/worker/emailWorker';
import { pool } from '../src/db';
import nodemailerMock from 'nodemailer-mock';

/**
 * Email System Tests
 * 
 * Tests for SMTP email delivery, worker processing, and receipt sending.
 * Uses nodemailer-mock for isolated testing without actual SMTP sends.
 */

describe('Email System', () => {
  
  beforeEach(() => {
    // Reset mock between tests
    nodemailerMock.mock.reset();
    
    // Set dry-run mode for tests
    process.env.EMAIL_DRY_RUN = 'true';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.EMAIL_DRY_RUN;
  });

  describe('SMTP Transport', () => {
    
    test('should create transport in dry-run mode', () => {
      const transport = createSMTPTransport({
        host: 'localhost',
        port: 587,
        secure: false,
        user: 'test',
        pass: 'test',
        from: 'test@example.com',
        dryRun: true
      });

      expect(transport).toBeDefined();
    });

    test('should handle health check in dry-run mode', async () => {
      const result = await healthCheckSMTP();
      
      expect(result.success).toBe(true);
      expect(result.connectionTime).toBe(0);
    });

    test('should fail health check with invalid SMTP config', async () => {
      // Temporarily disable dry-run
      delete process.env.EMAIL_DRY_RUN;
      
      const transport = createSMTPTransport({
        host: 'invalid-host',
        port: 587,
        secure: false,
        user: 'invalid',
        pass: 'invalid',
        from: 'test@example.com',
        dryRun: false
      });

      const result = await healthCheckSMTP(transport);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Receipt Sending', () => {
    
    test('should validate receipt payload correctly', () => {
      const validPayload = {
        memberDisplayName: 'Max Mustermann',
        productLabel: 'Radsport Bonus',
        serial: 'CARD-123',
        eventTimeUTC: new Date(),
        remainingUses: 10,
        expiresAtUTC: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      const validation = validateReceiptPayload(validPayload);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid payload', () => {
      const invalidPayload = {
        memberDisplayName: '',
        productLabel: 'Radsport Bonus',
        serial: '',
        eventTimeUTC: new Date(),
        remainingUses: -1, // Invalid negative
        expiresAtUTC: new Date()
      };

      const validation = validateReceiptPayload(invalidPayload);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should send receipt in dry-run mode', async () => {
      const payload = {
        memberDisplayName: 'Anna Schmidt',
        productLabel: 'Radsport Bonus',
        serial: 'CARD-456',
        eventTimeUTC: new Date(),
        remainingUses: 8,
        expiresAtUTC: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const result = await sendDeductionReceipt({
        to: 'anna.schmidt@example.com',
        locale: 'de',
        payload
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^dry-run-/);
    });

    test('should handle unlimited product (null remaining uses)', async () => {
      const payload = {
        memberDisplayName: 'Hans Weber',
        productLabel: 'Radsport Unlimited',
        serial: 'CARD-789',
        eventTimeUTC: new Date(),
        remainingUses: null, // Unlimited product
        expiresAtUTC: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const result = await sendDeductionReceipt({
        to: 'hans.weber@example.com',
        locale: 'de',
        payload
      });

      expect(result.success).toBe(true);
    });

    test('should reject unsupported locale', async () => {
      const payload = {
        memberDisplayName: 'John Doe',
        productLabel: 'Cycling Bonus',
        serial: 'CARD-EN',
        eventTimeUTC: new Date(),
        remainingUses: 5,
        expiresAtUTC: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const result = await sendDeductionReceipt({
        to: 'john.doe@example.com',
        locale: 'en', // Unsupported
        payload
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported locale');
    });
  });

  describe('Email Worker', () => {
    let worker: EmailWorker;

    beforeEach(() => {
      // Create worker with test configuration
      worker = new EmailWorker(pool, {
        batchSize: 5,
        concurrency: 1,
        maxRetries: 2,
        retryBackoffMs: 100, // Faster for tests
        pollIntervalMs: 1000 // Faster for tests
      });
    });

    afterEach(async () => {
      if (worker) {
        await worker.stop();
      }
    });

    test('should get initial stats', async () => {
      const stats = await worker.getStats();
      
      expect(stats).toHaveProperty('queuedCount');
      expect(stats).toHaveProperty('sentCount');
      expect(stats).toHaveProperty('failedCount');
      expect(stats).toHaveProperty('totalCount');
      expect(typeof stats.queuedCount).toBe('number');
    });

    test('should process queued emails in dry-run mode', async () => {
      // First ensure we have the migration applied and a test email queued
      try {
        // Apply migration if needed
        await pool.query(`
          ALTER TABLE email_receipts 
          ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE NULL,
          ADD COLUMN IF NOT EXISTS last_error TEXT NULL
        `);
      } catch (error) {
        // Migration columns might already exist
      }

      // Insert a test email receipt
      const insertResult = await pool.query(`
        INSERT INTO email_receipts (
          email_to, member_display_name, product_label, card_serial,
          event_time_utc, remaining_uses, expires_at_utc, status
        ) VALUES (
          'test@example.com', 'Test User', 'Test Product', 'TEST-123',
          NOW(), 5, NOW() + INTERVAL '30 days', 'Queued'
        ) RETURNING id
      `);

      const emailId = insertResult.rows[0].id;

      // Get initial stats
      const statsBefore = await worker.getStats();
      const queuedBefore = statsBefore.queuedCount;

      // Process one batch manually (since starting the full worker is complex in tests)
      // This simulates what the worker would do
      const queuedEmails = await pool.query(`
        SELECT 
          id, email_to, member_display_name, product_label, card_serial,
          event_time_utc, remaining_uses, expires_at_utc, attempts, status
        FROM email_receipts 
        WHERE status = 'Queued' AND id = $1
        FOR UPDATE SKIP LOCKED
      `, [emailId]);

      expect(queuedEmails.rows.length).toBe(1);

      const email = queuedEmails.rows[0];
      
      // Simulate processing the email
      const payload = {
        memberDisplayName: email.member_display_name,
        productLabel: email.product_label,
        serial: email.card_serial,
        eventTimeUTC: email.event_time_utc,
        remainingUses: email.remaining_uses,
        expiresAtUTC: email.expires_at_utc
      };

      const result = await sendDeductionReceipt({
        to: email.email_to,
        locale: 'de',
        payload
      });

      expect(result.success).toBe(true);

      // Mark as sent (simulate worker behavior)
      await pool.query(`
        UPDATE email_receipts 
        SET status = 'Sent', sent_at = NOW(), message_id = $2
        WHERE id = $1
      `, [emailId, result.messageId]);

      // Verify it was marked as sent
      const updatedEmail = await pool.query(`
        SELECT status, sent_at, message_id 
        FROM email_receipts 
        WHERE id = $1
      `, [emailId]);

      expect(updatedEmail.rows[0].status).toBe('Sent');
      expect(updatedEmail.rows[0].sent_at).not.toBeNull();
      expect(updatedEmail.rows[0].message_id).toBe(result.messageId);

      // Clean up test data
      await pool.query('DELETE FROM email_receipts WHERE id = $1', [emailId]);
    });
  });

  describe('Email Template Generation', () => {
    
    test('should format Berlin timezone correctly', async () => {
      const utcTime = new Date('2025-09-20T14:30:00.000Z'); // 2:30 PM UTC
      
      const payload = {
        memberDisplayName: 'Berlin User',
        productLabel: 'Timezone Test',
        serial: 'TZ-123',
        eventTimeUTC: utcTime,
        remainingUses: 3,
        expiresAtUTC: new Date('2025-12-20T23:59:59.000Z')
      };

      // Create a mock transport to capture the email content
      const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
        verify: jest.fn().mockResolvedValue(true),
        close: jest.fn()
      };

      const result = await sendDeductionReceipt({
        to: 'timezone@example.com',
        locale: 'de',
        payload,
        transport: mockTransport as any
      });

      expect(result.success).toBe(true);
      expect(mockTransport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'timezone@example.com',
          subject: 'Sportfabrik – Besuch erfasst (Timezone Test)',
          text: expect.stringContaining('16:30'), // Should be Berlin time (UTC+2 in September)
          html: expect.stringContaining('16:30')
        })
      );
    });

    test('should include remaining uses for bonus cards', async () => {
      const payload = {
        memberDisplayName: 'Bonus User',
        productLabel: 'Radsport Bonus',
        serial: 'BONUS-123',
        eventTimeUTC: new Date(),
        remainingUses: 7,
        expiresAtUTC: new Date()
      };

      const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-456' }),
        verify: jest.fn().mockResolvedValue(true),
        close: jest.fn()
      };

      await sendDeductionReceipt({
        to: 'bonus@example.com',
        locale: 'de',
        payload,
        transport: mockTransport as any
      });

      expect(mockTransport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Restguthaben: 7 von 11'),
          html: expect.stringContaining('Restguthaben:</td>\n        <td style="padding: 4px 0;">7 von 11</td>')
        })
      );
    });

    test('should omit remaining uses for unlimited cards', async () => {
      const payload = {
        memberDisplayName: 'Unlimited User',
        productLabel: 'Radsport Unlimited',
        serial: 'UNLIMITED-123',
        eventTimeUTC: new Date(),
        remainingUses: null, // Unlimited
        expiresAtUTC: new Date()
      };

      const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-789' }),
        verify: jest.fn().mockResolvedValue(true),
        close: jest.fn()
      };

      await sendDeductionReceipt({
        to: 'unlimited@example.com',
        locale: 'de',
        payload,
        transport: mockTransport as any
      });

      expect(mockTransport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining('Restguthaben:'),
          html: expect.not.stringContaining('Restguthaben:')
        })
      );
    });
  });
});