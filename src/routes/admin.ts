import { Router } from 'express';
import { validate, schemas } from '../middleware/validate';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { rollbackCard, cancelCard } from '../services/cards';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// POST /cards/:cardId/rollback - Rollback last deduction (admin only)
router.post('/:cardId/rollback',
  validate({ 
    params: schemas.uuidParam,
    body: schemas.rollback
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const { reasonCode, note } = req.body;
      const staffId = req.staff!.staffId;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      const card = await rollbackCard(cardId, staffId, reasonCode, note, idempotencyKey);
      res.json(card);
    } catch (error) {
      console.error('Rollback card error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Card not found') {
          res.status(404).json({ error: 'Card not found' });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /cards/:cardId/cancel - Cancel card (admin only)
router.post('/:cardId/cancel',
  validate({ 
    params: schemas.uuidParam,
    body: schemas.cancel
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const { reasonCode, note } = req.body;
      const staffId = req.staff!.staffId;

      const card = await cancelCard(cardId, staffId, reasonCode, note);
      res.json(card);
    } catch (error) {
      console.error('Cancel card error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Card not found') {
          res.status(404).json({ error: 'Card not found' });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;