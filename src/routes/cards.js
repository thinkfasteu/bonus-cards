"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const cards_1 = require("../services/cards");
const router = (0, express_1.Router)();
// All card routes require authentication
router.use(auth_1.authenticate);
router.use(auth_1.requireStaff);
// POST /cards - Issue new card
router.post('/', (0, validate_1.validate)({ body: validate_1.schemas.issueCard }), async (req, res) => {
    try {
        const { memberId, product, expiresAt } = req.body;
        const staffId = req.staff.staffId;
        const customExpiry = expiresAt ? new Date(expiresAt) : undefined;
        const card = await (0, cards_1.issueCard)(memberId, product, staffId, customExpiry);
        res.status(201).json(card);
    }
    catch (error) {
        console.error('Issue card error:', error);
        if (error instanceof Error) {
            if (error.message === 'Member not found') {
                res.status(404).json({ error: 'Member not found' });
                return;
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /cards/:cardId - Get card details
router.get('/:cardId', (0, validate_1.validate)({ params: validate_1.schemas.uuidParam }), async (req, res) => {
    try {
        const { cardId } = req.params;
        const card = await (0, cards_1.getCardById)(cardId);
        if (!card) {
            res.status(404).json({ error: 'Card not found' });
            return;
        }
        res.json(card);
    }
    catch (error) {
        console.error('Get card error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /cards/:cardId/deduct - Deduct card usage
router.post('/:cardId/deduct', (0, validate_1.validate)({
    params: validate_1.schemas.uuidParam,
    body: validate_1.schemas.deduct
}), async (req, res) => {
    try {
        const { cardId } = req.params;
        const staffId = req.staff.staffId;
        const idempotencyKey = req.headers['x-idempotency-key'];
        const card = await (0, cards_1.deductCard)(cardId, staffId, idempotencyKey);
        res.json(card);
    }
    catch (error) {
        console.error('Deduct card error:', error);
        if (error instanceof Error) {
            if (error.message === 'Card not found') {
                res.status(404).json({ error: 'Card not found' });
                return;
            }
            if (error.message.includes('Cannot deduct from card in state') ||
                error.message === 'Card has expired' ||
                error.message === 'No remaining uses on card') {
                res.status(409).json({
                    error: 'Cannot deduct from card',
                    details: error.message
                });
                return;
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
