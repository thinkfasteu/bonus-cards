import { Router } from 'express';
import { validate, schemas } from '../middleware/validate';
import { authenticate, requireStaff, AuthenticatedRequest } from '../middleware/auth';
import { issueCard, getCardById, deductCard } from '../services/cards';

const router = Router();

// All card routes require authentication
router.use(authenticate);
router.use(requireStaff);

// POST /cards - Issue new card
router.post('/', 
  validate({ body: schemas.issueCard }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId, product, expiresAt } = req.body;
      const staffId = req.staff!.staffId;

      const customExpiry = expiresAt ? new Date(expiresAt) : undefined;
      const card = await issueCard(memberId, product, staffId, customExpiry);

      res.status(201).json(card);
    } catch (error) {
      console.error('Issue card error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Member not found') {
          res.status(404).json({ error: 'Member not found' });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /cards/:cardId - Get card details
router.get('/:cardId',
  validate({ params: schemas.uuidParam }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const card = await getCardById(cardId);

      if (!card) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }

      res.json(card);
    } catch (error) {
      console.error('Get card error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /cards/:cardId/deduct - Deduct card usage
router.post('/:cardId/deduct',
  validate({ 
    params: schemas.uuidParam,
    body: schemas.deduct
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const staffId = req.staff!.staffId;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      const card = await deductCard(cardId, staffId, idempotencyKey);
      res.json(card);
    } catch (error) {
      console.error('Deduct card error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Card not found') {
          res.status(404).json({ error: 'Card not found' });
          return;
        }
        
        if (
          error.message.includes('Cannot deduct from card in state') ||
          error.message === 'Card has expired' ||
          error.message === 'No remaining uses on card'
        ) {
          res.status(409).json({ 
            error: 'Cannot deduct from card',
            details: error.message 
          });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;