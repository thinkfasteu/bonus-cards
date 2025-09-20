"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const cards_1 = require("../services/cards");
const router = (0, express_1.Router)();
// All admin routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
// POST /cards/:cardId/rollback - Rollback last deduction (admin only)
router.post('/:cardId/rollback', (0, validate_1.validate)({
    params: validate_1.schemas.uuidParam,
    body: validate_1.schemas.rollback
}), async (req, res) => {
    try {
        const { cardId } = req.params;
        const { reasonCode, note } = req.body;
        const staffId = req.staff.staffId;
        const idempotencyKey = req.headers['x-idempotency-key'];
        const card = await (0, cards_1.rollbackCard)(cardId, staffId, reasonCode, note, idempotencyKey);
        res.json(card);
    }
    catch (error) {
        console.error('Rollback card error:', error);
        if (error instanceof Error) {
            if (error.message === 'Card not found') {
                res.status(404).json({ error: 'Card not found' });
                return;
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /cards/:cardId/cancel - Cancel card (admin only)
router.post('/:cardId/cancel', (0, validate_1.validate)({
    params: validate_1.schemas.uuidParam,
    body: validate_1.schemas.cancel
}), async (req, res) => {
    try {
        const { cardId } = req.params;
        const { reasonCode, note } = req.body;
        const staffId = req.staff.staffId;
        const card = await (0, cards_1.cancelCard)(cardId, staffId, reasonCode, note);
        res.json(card);
    }
    catch (error) {
        console.error('Cancel card error:', error);
        if (error instanceof Error) {
            if (error.message === 'Card not found') {
                res.status(404).json({ error: 'Card not found' });
                return;
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
