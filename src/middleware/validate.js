"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
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
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                res.status(400).json({
                    error: 'Validation failed',
                    details
                });
            }
            else {
                res.status(500).json({
                    error: 'Internal validation error'
                });
            }
        }
    };
}
// Common validation schemas
exports.schemas = {
    // UUID parameter validation
    uuidParam: zod_1.z.object({
        cardId: zod_1.z.string().uuid('Invalid card ID format')
    }),
    // Issue card request
    issueCard: zod_1.z.object({
        memberId: zod_1.z.string().uuid('Invalid member ID format'),
        product: zod_1.z.enum(['cycling_bonus', 'cycling_unlimited'], {
            errorMap: () => ({ message: 'Product must be cycling_bonus or cycling_unlimited' })
        }),
        expiresAt: zod_1.z.string().datetime().optional()
    }),
    // Deduct request
    deduct: zod_1.z.object({
        confirm: zod_1.z.boolean().refine(val => val === true, {
            message: 'Confirmation is required (confirm must be true)'
        })
    }),
    // Rollback request
    rollback: zod_1.z.object({
        reasonCode: zod_1.z.enum(['MISTAKE', 'FRAUD_SUSPECTED', 'CARD_LOST', 'OTHER'], {
            errorMap: () => ({ message: 'Invalid reason code' })
        }),
        note: zod_1.z.string().max(500, 'Note must be 500 characters or less').optional()
    }),
    // Cancel request
    cancel: zod_1.z.object({
        reasonCode: zod_1.z.enum(['EXPIRED', 'FRAUD_SUSPECTED', 'CARD_LOST', 'CUSTOMER_REQUEST', 'OTHER'], {
            errorMap: () => ({ message: 'Invalid reason code' })
        }),
        note: zod_1.z.string().max(500, 'Note must be 500 characters or less').optional()
    }),
    // Transaction report query
    transactionReport: zod_1.z.object({
        from: zod_1.z.string().datetime('Invalid from date format (ISO 8601 required)'),
        to: zod_1.z.string().datetime('Invalid to date format (ISO 8601 required)')
    })
};
