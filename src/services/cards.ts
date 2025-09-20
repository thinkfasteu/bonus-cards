import { PoolClient } from 'pg';
import { query, withTransaction, queryInTransaction } from '../db';
import { enqueueEmail, generateDeductionEmailContent, generateRollbackEmailContent } from './email';

// Idempotency support
interface IdempotencyRecord {
  key: string;
  cardId: string;
  action: string;
  result: any;
  createdAt: Date;
}

export type CardState = 'Active' | 'Expired' | 'UsedUp' | 'Cancelled';
export type ProductType = 'cycling_bonus' | 'cycling_unlimited';
export type EventType = 'Issued' | 'Deduct' | 'Rollback' | 'Cancel';

export interface Card {
  cardId: string;
  memberId: string;
  serial: string;
  product: ProductType;
  state: CardState;
  remainingUses: number | null;
  issuedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardSnapshot {
  cardId: string;
  serial: string;
  memberDisplayName: string;
  product: ProductType;
  state: CardState;
  remainingUses: number | null;
  expiresAt: Date;
}

export interface Member {
  memberId: string;
  displayName: string;
  email: string;
}

interface AppConfigRow {
  config_value: string;
}

interface CardRow {
  id: string;
  member_id: string;
  serial: string;
  product: ProductType;
  state: CardState;
  remaining_uses: number | null;
  issued_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface MemberRow {
  id: string;
  display_name: string;
  email: string;
}

interface CardWithMemberRow extends CardRow {
  member_display_name: string;
  member_email: string;
}

export async function getConfig(key: string): Promise<string | null> {
  const result = await query<AppConfigRow>(
    'SELECT value as config_value FROM app_config WHERE key = $1',
    [key]
  );
  return result.rows.length > 0 ? result.rows[0].config_value : null;
}

export async function getMemberById(memberId: string): Promise<Member | null> {
  const result = await query<MemberRow>(
    'SELECT id, display_name, email FROM members WHERE id = $1',
    [memberId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    memberId: row.id,
    displayName: row.display_name,
    email: row.email
  };
}

export async function getCardById(cardId: string): Promise<CardSnapshot | null> {
  const result = await query<CardWithMemberRow>(
    `SELECT 
       c.id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
       m.display_name as member_display_name, m.email as member_email
     FROM cards c
     JOIN members m ON c.member_id = m.id
     WHERE c.id = $1`,
    [cardId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  
  // Check for expiration and update state if needed
  const now = new Date();
  let currentState = row.state;
  
  if (currentState === 'Active' && now > row.expires_at) {
    currentState = 'Expired';
    // Update the state in database
    await query(
      'UPDATE cards SET state = $1, updated_at = now() WHERE id = $2',
      ['Expired', cardId]
    );
  }

  return {
    cardId: row.id,
    serial: row.serial,
    memberDisplayName: row.member_display_name,
    product: row.product,
    state: currentState,
    remainingUses: row.remaining_uses,
    expiresAt: row.expires_at
  };
}

function calculateExpiryDate(product: ProductType, issuedAt: Date): Date {
  if (product === 'cycling_bonus') {
    // Add bonus_expiry_months from config (default 12 months)
    const expiryDate = new Date(issuedAt);
    expiryDate.setMonth(expiryDate.getMonth() + 12); // Will be configurable
    return expiryDate;
  } else {
    // cycling_unlimited: end of calendar month
    const expiryDate = new Date(issuedAt);
    expiryDate.setMonth(expiryDate.getMonth() + 1, 0); // Last day of current month
    expiryDate.setHours(23, 59, 59, 999);
    return expiryDate;
  }
}

async function generateSerial(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Get next sequence number for this year
  const result = await query<{ next_seq: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(serial FROM 'BC-${year}-(\\d+)') AS INTEGER)), 0) + 1 as next_seq
     FROM cards 
     WHERE serial LIKE 'BC-${year}-%'`
  );
  
  const seq = result.rows[0]?.next_seq || 1;
  return `BC-${year}-${seq.toString().padStart(6, '0')}`;
}

async function logEvent(
  client: PoolClient,
  cardId: string,
  staffId: string,
  eventType: EventType,
  delta: number,
  reasonCode?: string,
  note?: string
): Promise<void> {
  await queryInTransaction(
    client,
    `INSERT INTO events (card_id, staff_id, type, delta, reason_code, note, ts)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [cardId, staffId, eventType, delta, reasonCode, note]
  );
}

export async function issueCard(
  memberId: string,
  product: ProductType,
  staffId: string,
  customExpiresAt?: Date
): Promise<CardSnapshot> {
  return withTransaction(async (client) => {
    // Verify member exists
    const member = await getMemberById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const issuedAt = new Date();
    const expiresAt = customExpiresAt || calculateExpiryDate(product, issuedAt);
    const serial = await generateSerial();
    
    const remainingUses = product === 'cycling_bonus' ? 11 : null;

    // Insert card
    const cardResult = await queryInTransaction<{ id: string }>(
      client,
      `INSERT INTO cards (member_id, serial, product, state, remaining_uses, issued_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'Active', $4, $5, $6, now(), now())
       RETURNING id`,
      [memberId, serial, product, remainingUses, issuedAt, expiresAt]
    );

    const cardId = cardResult.rows[0].id;

    // Log issuance event
    await logEvent(client, cardId, staffId, 'Issued', 0);

    return {
      cardId,
      serial,
      memberDisplayName: member.displayName,
      product,
      state: 'Active',
      remainingUses,
      expiresAt
    };
  });
}

export async function deductCard(
  cardId: string,
  staffId: string,
  idempotencyKey?: string
): Promise<CardSnapshot> {
  return withTransaction(async (client) => {
    // Check idempotency if key provided
    if (idempotencyKey) {
      const idempotencyResult = await queryInTransaction<IdempotencyRecord>(
        client,
        'SELECT key, card_id, action, result, created_at FROM idempotency_log WHERE key = $1 AND card_id = $2 AND action = $3',
        [idempotencyKey, cardId, 'deduct']
      );

      if (idempotencyResult.rows.length > 0) {
        const record = idempotencyResult.rows[0];
        // If within 2 minutes, return cached result
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (record.createdAt > twoMinutesAgo) {
          return record.result;
        }
      }
    }

    // Get current card state with member info using SELECT FOR UPDATE
    const cardResult = await queryInTransaction<CardWithMemberRow>(
      client,
      `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1
       FOR UPDATE`,
      [cardId]
    );

    if (cardResult.rows.length === 0) {
      throw new Error('Card not found');
    }

    const card = cardResult.rows[0];
    const now = new Date();

    // Enforce expiry check
    if (now > card.expires_at) {
      // Update state to Expired if not already
      if (card.state === 'Active') {
        await queryInTransaction(
          client,
          'UPDATE cards SET state = $1, updated_at = now() WHERE id = $2',
          ['Expired', cardId]
        );
      }
      throw new Error('Card has expired');
    }

    // Validate card state
    if (card.state !== 'Active') {
      throw new Error(`Cannot deduct from card in state: ${card.state}`);
    }

    if (card.product === 'cycling_bonus') {
      if (!card.remaining_uses || card.remaining_uses <= 0) {
        throw new Error('No remaining uses on card');
      }
    }

    // Perform deduction
    let newRemainingUses = card.remaining_uses;
    let newState: CardState = 'Active';

    if (card.product === 'cycling_bonus') {
      newRemainingUses = card.remaining_uses! - 1;
      if (newRemainingUses === 0) {
        newState = 'UsedUp';
      }
    }

    // Update card
    await queryInTransaction(
      client,
      `UPDATE cards 
       SET remaining_uses = $1, state = $2, updated_at = now()
       WHERE id = $3`,
      [newRemainingUses, newState, cardId]
    );

    // Log deduction event
    await logEvent(client, cardId, staffId, 'Deduct', -1);

    // Store idempotency record if key provided
    if (idempotencyKey) {
      const result = {
        cardId: card.id,
        serial: card.serial,
        memberDisplayName: card.member_display_name,
        product: card.product,
        state: newState,
        remainingUses: newRemainingUses,
        expiresAt: card.expires_at
      };

      await queryInTransaction(
        client,
        'INSERT INTO idempotency_log (key, card_id, action, result, created_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (key) DO NOTHING',
        [idempotencyKey, cardId, 'deduct', JSON.stringify(result)]
      );
    }

    // Queue email notification
    const emailContent = generateDeductionEmailContent(
      card.member_display_name,
      card.serial,
      card.product,
      newRemainingUses,
      now
    );

    await enqueueEmail(
      card.member_email,
      emailContent.subject,
      emailContent.bodyText,
      emailContent.bodyHtml
    );

    return {
      cardId: card.id,
      serial: card.serial,
      memberDisplayName: card.member_display_name,
      product: card.product,
      state: newState,
      remainingUses: newRemainingUses,
      expiresAt: card.expires_at
    };
  });
}

export async function rollbackCard(
  cardId: string,
  staffId: string,
  reasonCode: string,
  note?: string,
  idempotencyKey?: string
): Promise<CardSnapshot> {
  return withTransaction(async (client) => {
    // Check idempotency if key provided
    if (idempotencyKey) {
      const idempotencyResult = await queryInTransaction<IdempotencyRecord>(
        client,
        'SELECT key, card_id, action, result, created_at FROM idempotency_log WHERE key = $1 AND card_id = $2 AND action = $3',
        [idempotencyKey, cardId, 'rollback']
      );

      if (idempotencyResult.rows.length > 0) {
        const record = idempotencyResult.rows[0];
        // If within 2 minutes, return cached result
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (record.createdAt > twoMinutesAgo) {
          return record.result;
        }
      }
    }

    // Get current card state with SELECT FOR UPDATE
    const cardResult = await queryInTransaction<CardWithMemberRow>(
      client,
      `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1
       FOR UPDATE`,
      [cardId]
    );

    if (cardResult.rows.length === 0) {
      throw new Error('Card not found');
    }

    const card = cardResult.rows[0];
    let newRemainingUses = card.remaining_uses;
    let newState: CardState = card.state;

    if (card.product === 'cycling_bonus') {
      // Add one use back, but cap at maximum (11)
      newRemainingUses = Math.min((card.remaining_uses || 0) + 1, 11);
      
      // If card was UsedUp and now has uses, make it Active
      if (card.state === 'UsedUp' && newRemainingUses > 0) {
        newState = 'Active';
      }
    }

    // Update card
    await queryInTransaction(
      client,
      `UPDATE cards 
       SET remaining_uses = $1, state = $2, updated_at = now()
       WHERE id = $3`,
      [newRemainingUses, newState, cardId]
    );

    // Log rollback event
    await logEvent(client, cardId, staffId, 'Rollback', 1, reasonCode, note);

    // Store idempotency record if key provided
    if (idempotencyKey) {
      const result = {
        cardId: card.id,
        serial: card.serial,
        memberDisplayName: card.member_display_name,
        product: card.product,
        state: newState,
        remainingUses: newRemainingUses,
        expiresAt: card.expires_at
      };

      await queryInTransaction(
        client,
        'INSERT INTO idempotency_log (key, card_id, action, result, created_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (key) DO NOTHING',
        [idempotencyKey, cardId, 'rollback', JSON.stringify(result)]
      );
    }

    // Queue email notification
    const emailContent = generateRollbackEmailContent(
      card.member_display_name,
      card.serial,
      card.product,
      newRemainingUses,
      new Date(),
      reasonCode
    );

    await enqueueEmail(
      card.member_email,
      emailContent.subject,
      emailContent.bodyText,
      emailContent.bodyHtml
    );

    return {
      cardId: card.id,
      serial: card.serial,
      memberDisplayName: card.member_display_name,
      product: card.product,
      state: newState,
      remainingUses: newRemainingUses,
      expiresAt: card.expires_at
    };
  });
}

export async function cancelCard(
  cardId: string,
  staffId: string,
  reasonCode?: string,
  note?: string
): Promise<CardSnapshot> {
  return withTransaction(async (client) => {
    // Get current card state
    const cardResult = await queryInTransaction<CardWithMemberRow>(
      client,
      `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (cardResult.rows.length === 0) {
      throw new Error('Card not found');
    }

    const card = cardResult.rows[0];

    // Update card to cancelled state
    await queryInTransaction(
      client,
      `UPDATE cards 
       SET state = 'Cancelled', updated_at = now()
       WHERE id = $1`,
      [cardId]
    );

    // Log cancellation event
    await logEvent(client, cardId, staffId, 'Cancel', 0, reasonCode, note);

    return {
      cardId: card.id,
      serial: card.serial,
      memberDisplayName: card.member_display_name,
      product: card.product,
      state: 'Cancelled',
      remainingUses: card.remaining_uses,
      expiresAt: card.expires_at
    };
  });
}