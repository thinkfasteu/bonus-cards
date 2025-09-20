import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate path parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          error: 'Validation failed',
          details
        });
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    }
  };
}

// Common validation schemas
export const schemas = {
  // UUID parameter validation
  uuidParam: z.object({
    cardId: z.string().uuid('Invalid card ID format')
  }),

  // Issue card request
  issueCard: z.object({
    memberId: z.string().uuid('Invalid member ID format'),
    product: z.enum(['cycling_bonus', 'cycling_unlimited'], {
      errorMap: () => ({ message: 'Product must be cycling_bonus or cycling_unlimited' })
    }),
    expiresAt: z.string().datetime().optional()
  }),

  // Deduct request
  deduct: z.object({
    confirm: z.boolean().refine(val => val === true, {
      message: 'Confirmation is required (confirm must be true)'
    })
  }),

  // Rollback request
  rollback: z.object({
    reasonCode: z.enum(['MISTAKE', 'FRAUD_SUSPECTED', 'CARD_LOST', 'OTHER'], {
      errorMap: () => ({ message: 'Invalid reason code' })
    }),
    note: z.string().max(500, 'Note must be 500 characters or less').optional()
  }),

  // Cancel request
  cancel: z.object({
    reasonCode: z.enum(['EXPIRED', 'FRAUD_SUSPECTED', 'CARD_LOST', 'CUSTOMER_REQUEST', 'OTHER'], {
      errorMap: () => ({ message: 'Invalid reason code' })
    }),
    note: z.string().max(500, 'Note must be 500 characters or less').optional()
  }),

  // Transaction report query
  transactionReport: z.object({
    from: z.string().datetime('Invalid from date format (ISO 8601 required)'),
    to: z.string().datetime('Invalid to date format (ISO 8601 required)')
  }),

  // Email receipts query
  emailReceipts: z.object({
    status: z.enum(['Queued', 'Sent', 'Failed']).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().transform(val => {
      const num = val ? parseInt(val, 10) : 50;
      return Math.min(Math.max(num, 1), 100); // Between 1 and 100
    }),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional().transform(val => {
      const num = val ? parseInt(val, 10) : 0;
      return Math.max(num, 0); // Minimum 0
    })
  }),

  // Email retry request
  emailRetry: z.object({
    receiptIds: z.array(z.string().uuid('Invalid receipt ID format')).min(1, 'At least one receipt ID is required').max(50, 'Maximum 50 receipts can be retried at once')
  }),

  // Staff login request
  staffLogin: z.object({
    username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
    password: z.string().min(1, 'Password is required')
  }),

  // Pagination query (reusable)
  pagination: z.object({
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().transform(val => {
      const num = val ? parseInt(val, 10) : 50;
      return Math.min(Math.max(num, 1), 100);
    }),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional().transform(val => {
      const num = val ? parseInt(val, 10) : 0;
      return Math.max(num, 0);
    })
  }),

  // Numeric ID parameter validation
  numericIdParam: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(val => parseInt(val, 10))
  })
};