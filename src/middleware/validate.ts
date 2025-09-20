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
  })
};