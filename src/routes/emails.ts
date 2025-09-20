import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';

/**
 * Admin Email Management Routes
 * 
 * Provides endpoints for monitoring and managing email receipt delivery.
 * All endpoints require admin authentication.
 */

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * GET /admin/email-receipts
 * 
 * List email receipts with filtering and pagination
 */
router.get('/email-receipts', 
  validate({ query: schemas.emailReceipts }),
  async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query as any; // Validated by Zod
    
    // Build WHERE clause for status filtering
    let whereClause = '';
    const queryParams: any[] = [limit, offset];
    
    if (status) {
      whereClause = 'WHERE er.status = $3';
      queryParams.push(status);
    }

    // Query email receipts with related data
    const query = `
      SELECT 
        er.id,
        er.to_email,
        er.status,
        er.attempts,
        er.created_at,
        er.sent_at,
        er.last_error,
        er.message_id,
        c.serial as card_serial,
        c.product,
        m.display_name as member_display_name,
        e.staff_username as processed_by_staff
      FROM email_receipts er
      LEFT JOIN cards c ON er.card_id = c.id
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN events e ON er.event_id = e.id
      ${whereClause}
      ORDER BY er.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM email_receipts er
      ${whereClause}
    `;
    
    const countParams = whereClause ? [queryParams[2]] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Format response
    const receipts = result.rows.map(row => ({
      id: row.id,
      emailTo: row.to_email,
      memberDisplayName: row.member_display_name,
      productLabel: row.product === 'cycling_bonus' ? 'Radsport Bonus' : 'Radsport Unlimited',
      cardSerial: row.card_serial,
      status: row.status,
      attempts: row.attempts,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      lastError: row.last_error,
      messageId: row.message_id,
      processedByStaff: row.processed_by_staff
    }));

    res.json({
      receipts,
      pagination: {
        total,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching email receipts:', error);
    res.status(500).json({
      error: 'Failed to fetch email receipts'
    });
  }
});

/**
 * POST /admin/email-receipts/retry/:id
 * 
 * Retry a failed email receipt
 */
router.post('/email-receipts/retry/:id',
  validate({ params: schemas.numericIdParam }),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any; // Validated by Zod, now a number

    // Check if receipt exists and is in Failed status
    const checkQuery = `
      SELECT id, status, attempts 
      FROM email_receipts 
      WHERE id = $1
    `;

    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Email receipt not found'
      });
    }

    const receipt = checkResult.rows[0];

    if (receipt.status !== 'Failed') {
      return res.status(400).json({
        error: `Cannot retry receipt with status: ${receipt.status}. Only Failed receipts can be retried.`
      });
    }

    // Reset status to Queued and attempts to 0
    const retryQuery = `
      UPDATE email_receipts 
      SET 
        status = 'Queued',
        attempts = 0,
        last_error = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, attempts
    `;

    const retryResult = await pool.query(retryQuery, [id]);
    const updatedReceipt = retryResult.rows[0];

    console.log(`📧 Admin retry: Receipt ${id} reset to Queued by ${req.headers['x-staff-username']}`);

    res.json({
      success: true,
      receipt: {
        id: updatedReceipt.id,
        status: updatedReceipt.status,
        attempts: updatedReceipt.attempts
      }
    });

  } catch (error) {
    console.error('Error retrying email receipt:', error);
    res.status(500).json({
      error: 'Failed to retry email receipt'
    });
  }
});

/**
 * GET /admin/email-receipts/stats
 * 
 * Get email delivery statistics
 */
router.get('/email-receipts/stats', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM email_receipts 
      GROUP BY status
      ORDER BY status
    `;

    const result = await pool.query(query);

    const stats = {
      total: 0,
      byStatus: {} as Record<string, {
        count: number;
        oldest: string | null;
        newest: string | null;
      }>
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      stats.total += count;
      stats.byStatus[row.status] = {
        count,
        oldest: row.oldest,
        newest: row.newest
      };
    });

    // Add missing statuses with 0 count
    const allStatuses = ['Queued', 'Sent', 'Failed'];
    allStatuses.forEach(status => {
      if (!stats.byStatus[status]) {
        stats.byStatus[status] = {
          count: 0,
          oldest: null,
          newest: null
        };
      }
    });

    res.json(stats);

  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      error: 'Failed to fetch email statistics'
    });
  }
});

/**
 * GET /admin/email-receipts/:id
 * 
 * Get details of a specific email receipt
 */
router.get('/email-receipts/:id',
  validate({ params: schemas.numericIdParam }),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any; // Validated by Zod

    const query = `
      SELECT 
        er.*,
        e.staff_username as processed_by_staff,
        e.created_at as event_created_at
      FROM email_receipts er
      LEFT JOIN events e ON er.event_id = e.id
      WHERE er.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email receipt not found'
      });
    }

    const receipt = result.rows[0];

    res.json({
      id: receipt.id,
      emailTo: receipt.email_to,
      memberDisplayName: receipt.member_display_name,
      productLabel: receipt.product_label,
      cardSerial: receipt.card_serial,
      eventTimeUTC: receipt.event_time_utc,
      remainingUses: receipt.remaining_uses,
      expiresAtUTC: receipt.expires_at_utc,
      status: receipt.status,
      attempts: receipt.attempts,
      createdAt: receipt.created_at,
      updatedAt: receipt.updated_at,
      sentAt: receipt.sent_at,
      lastError: receipt.last_error,
      messageId: receipt.message_id,
      eventId: receipt.event_id,
      processedByStaff: receipt.processed_by_staff,
      eventCreatedAt: receipt.event_created_at
    });

  } catch (error) {
    console.error('Error fetching email receipt:', error);
    res.status(500).json({
      error: 'Failed to fetch email receipt'
    });
  }
});

export default router;