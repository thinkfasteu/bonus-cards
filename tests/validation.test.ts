import { describe, test, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { schemas } from '../src/middleware/validate';

describe('Validation Schemas', () => {
  describe('uuidParam', () => {
    test('should accept valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = schemas.uuidParam.parse({ cardId: validUuid });
      expect(result.cardId).toBe(validUuid);
    });

    test('should reject invalid UUID format', () => {
      expect(() => {
        schemas.uuidParam.parse({ cardId: 'invalid-uuid' });
      }).toThrow(ZodError);
    });

    test('should reject missing cardId', () => {
      expect(() => {
        schemas.uuidParam.parse({});
      }).toThrow(ZodError);
    });
  });

  describe('issueCard', () => {
    test('should accept valid card issue request', () => {
      const validRequest = {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        product: 'cycling_bonus' as const,
        expiresAt: '2025-12-31T23:59:59.000Z'
      };
      const result = schemas.issueCard.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    test('should accept request without expiry date', () => {
      const validRequest = {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        product: 'cycling_unlimited' as const
      };
      const result = schemas.issueCard.parse(validRequest);
      expect(result.expiresAt).toBeUndefined();
    });

    test('should reject invalid product type', () => {
      expect(() => {
        schemas.issueCard.parse({
          memberId: '123e4567-e89b-12d3-a456-426614174000',
          product: 'invalid_product'
        });
      }).toThrow(ZodError);
    });

    test('should reject invalid member ID format', () => {
      expect(() => {
        schemas.issueCard.parse({
          memberId: 'invalid-uuid',
          product: 'cycling_bonus'
        });
      }).toThrow(ZodError);
    });

    test('should reject invalid datetime format', () => {
      expect(() => {
        schemas.issueCard.parse({
          memberId: '123e4567-e89b-12d3-a456-426614174000',
          product: 'cycling_bonus',
          expiresAt: 'invalid-date'
        });
      }).toThrow(ZodError);
    });
  });

  describe('deduct', () => {
    test('should accept confirmation request', () => {
      const result = schemas.deduct.parse({ confirm: true });
      expect(result.confirm).toBe(true);
    });

    test('should reject false confirmation', () => {
      expect(() => {
        schemas.deduct.parse({ confirm: false });
      }).toThrow(ZodError);
    });

    test('should reject missing confirmation', () => {
      expect(() => {
        schemas.deduct.parse({});
      }).toThrow(ZodError);
    });
  });

  describe('rollback', () => {
    test('should accept valid rollback request', () => {
      const validRequest = {
        reasonCode: 'MISTAKE' as const,
        note: 'Accidental scan'
      };
      const result = schemas.rollback.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    test('should accept request without note', () => {
      const validRequest = {
        reasonCode: 'FRAUD_SUSPECTED' as const
      };
      const result = schemas.rollback.parse(validRequest);
      expect(result.note).toBeUndefined();
    });

    test('should reject invalid reason code', () => {
      expect(() => {
        schemas.rollback.parse({
          reasonCode: 'INVALID_REASON'
        });
      }).toThrow(ZodError);
    });

    test('should reject note too long', () => {
      expect(() => {
        schemas.rollback.parse({
          reasonCode: 'MISTAKE',
          note: 'x'.repeat(501) // 501 characters
        });
      }).toThrow(ZodError);
    });
  });

  describe('cancel', () => {
    test('should accept valid cancel request', () => {
      const validRequest = {
        reasonCode: 'EXPIRED' as const,
        note: 'Card expired'
      };
      const result = schemas.cancel.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    test('should reject invalid reason code', () => {
      expect(() => {
        schemas.cancel.parse({
          reasonCode: 'INVALID_REASON'
        });
      }).toThrow(ZodError);
    });
  });

  describe('transactionReport', () => {
    test('should accept valid date range', () => {
      const validRequest = {
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-12-31T23:59:59.000Z'
      };
      const result = schemas.transactionReport.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    test('should reject invalid from date', () => {
      expect(() => {
        schemas.transactionReport.parse({
          from: 'invalid-date',
          to: '2025-12-31T23:59:59.000Z'
        });
      }).toThrow(ZodError);
    });

    test('should reject missing dates', () => {
      expect(() => {
        schemas.transactionReport.parse({});
      }).toThrow(ZodError);
    });
  });

  describe('emailReceipts', () => {
    test('should accept valid query parameters', () => {
      const validQuery = {
        status: 'Sent' as const,
        limit: '25',
        offset: '10'
      };
      const result = schemas.emailReceipts.parse(validQuery);
      expect(result.status).toBe('Sent');
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    test('should apply default values', () => {
      const result = schemas.emailReceipts.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.status).toBeUndefined();
    });

    test('should enforce maximum limit', () => {
      const result = schemas.emailReceipts.parse({ limit: '200' });
      expect(result.limit).toBe(100); // Capped at 100
    });

    test('should enforce minimum values', () => {
      const result = schemas.emailReceipts.parse({ 
        limit: '0',
        offset: '-5'
      });
      expect(result.limit).toBe(1); // Minimum 1
      expect(result.offset).toBe(0); // Minimum 0
    });

    test('should reject invalid status', () => {
      expect(() => {
        schemas.emailReceipts.parse({ status: 'InvalidStatus' });
      }).toThrow(ZodError);
    });

    test('should reject non-numeric limit/offset', () => {
      expect(() => {
        schemas.emailReceipts.parse({ limit: 'abc' });
      }).toThrow(ZodError);
    });
  });

  describe('numericIdParam', () => {
    test('should accept valid numeric ID', () => {
      const result = schemas.numericIdParam.parse({ id: '123' });
      expect(result.id).toBe(123);
    });

    test('should reject non-numeric ID', () => {
      expect(() => {
        schemas.numericIdParam.parse({ id: 'abc' });
      }).toThrow(ZodError);
    });

    test('should reject missing ID', () => {
      expect(() => {
        schemas.numericIdParam.parse({});
      }).toThrow(ZodError);
    });
  });

  describe('emailRetry', () => {
    test('should accept valid receipt IDs', () => {
      const validRequest = {
        receiptIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '456e7890-e89b-12d3-a456-426614174001'
        ]
      };
      const result = schemas.emailRetry.parse(validRequest);
      expect(result.receiptIds).toHaveLength(2);
    });

    test('should reject empty array', () => {
      expect(() => {
        schemas.emailRetry.parse({ receiptIds: [] });
      }).toThrow(ZodError);
    });

    test('should reject too many IDs', () => {
      const tooManyIds = Array(51).fill('123e4567-e89b-12d3-a456-426614174000');
      expect(() => {
        schemas.emailRetry.parse({ receiptIds: tooManyIds });
      }).toThrow(ZodError);
    });

    test('should reject invalid UUID format', () => {
      expect(() => {
        schemas.emailRetry.parse({ receiptIds: ['invalid-uuid'] });
      }).toThrow(ZodError);
    });
  });

  describe('staffLogin', () => {
    test('should accept valid login credentials', () => {
      const validRequest = {
        username: 'reception_staff',
        password: 'securePassword123'
      };
      const result = schemas.staffLogin.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    test('should reject empty username', () => {
      expect(() => {
        schemas.staffLogin.parse({
          username: '',
          password: 'password'
        });
      }).toThrow(ZodError);
    });

    test('should reject empty password', () => {
      expect(() => {
        schemas.staffLogin.parse({
          username: 'user',
          password: ''
        });
      }).toThrow(ZodError);
    });

    test('should reject username too long', () => {
      expect(() => {
        schemas.staffLogin.parse({
          username: 'x'.repeat(51),
          password: 'password'
        });
      }).toThrow(ZodError);
    });
  });
});