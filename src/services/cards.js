"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.getMemberById = getMemberById;
exports.getCardById = getCardById;
exports.issueCard = issueCard;
exports.deductCard = deductCard;
exports.rollbackCard = rollbackCard;
exports.cancelCard = cancelCard;
const db_1 = require("../db");
const email_1 = require("./email");
async function getConfig(key) {
    const result = await (0, db_1.query)('SELECT value as config_value FROM app_config WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].config_value : null;
}
async function getMemberById(memberId) {
    const result = await (0, db_1.query)('SELECT id, display_name, email FROM members WHERE id = $1', [memberId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
        memberId: row.id,
        displayName: row.display_name,
        email: row.email
    };
}
async function getCardById(cardId) {
    const result = await (0, db_1.query)(`SELECT 
       c.id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
       m.display_name as member_display_name, m.email as member_email
     FROM cards c
     JOIN members m ON c.member_id = m.id
     WHERE c.id = $1`, [cardId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    // Check for expiration and update state if needed
    const now = new Date();
    let currentState = row.state;
    if (currentState === 'Active' && now > row.expires_at) {
        currentState = 'Expired';
        // Update the state in database
        await (0, db_1.query)('UPDATE cards SET state = $1, updated_at = now() WHERE id = $2', ['Expired', cardId]);
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
function calculateExpiryDate(product, issuedAt) {
    if (product === 'cycling_bonus') {
        // Add bonus_expiry_months from config (default 12 months)
        const expiryDate = new Date(issuedAt);
        expiryDate.setMonth(expiryDate.getMonth() + 12); // Will be configurable
        return expiryDate;
    }
    else {
        // cycling_unlimited: end of calendar month
        const expiryDate = new Date(issuedAt);
        expiryDate.setMonth(expiryDate.getMonth() + 1, 0); // Last day of current month
        expiryDate.setHours(23, 59, 59, 999);
        return expiryDate;
    }
}
async function generateSerial() {
    const year = new Date().getFullYear();
    // Get next sequence number for this year
    const result = await (0, db_1.query)(`SELECT COALESCE(MAX(CAST(SUBSTRING(serial FROM 'BC-${year}-(\\d+)') AS INTEGER)), 0) + 1 as next_seq
     FROM cards 
     WHERE serial LIKE 'BC-${year}-%'`);
    const seq = result.rows[0]?.next_seq || 1;
    return `BC-${year}-${seq.toString().padStart(6, '0')}`;
}
async function logEvent(client, cardId, staffId, eventType, delta, reasonCode, note) {
    await (0, db_1.queryInTransaction)(client, `INSERT INTO events (card_id, staff_id, type, delta, reason_code, note, ts)
     VALUES ($1, $2, $3, $4, $5, $6, now())`, [cardId, staffId, eventType, delta, reasonCode, note]);
}
async function issueCard(memberId, product, staffId, customExpiresAt) {
    return (0, db_1.withTransaction)(async (client) => {
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
        const cardResult = await (0, db_1.queryInTransaction)(client, `INSERT INTO cards (member_id, serial, product, state, remaining_uses, issued_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'Active', $4, $5, $6, now(), now())
       RETURNING id`, [memberId, serial, product, remainingUses, issuedAt, expiresAt]);
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
async function deductCard(cardId, staffId, idempotencyKey) {
    return (0, db_1.withTransaction)(async (client) => {
        // Check idempotency if key provided
        if (idempotencyKey) {
            const idempotencyResult = await (0, db_1.queryInTransaction)(client, 'SELECT key, card_id, action, result, created_at FROM idempotency_log WHERE key = $1 AND card_id = $2 AND action = $3', [idempotencyKey, cardId, 'deduct']);
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
        const cardResult = await (0, db_1.queryInTransaction)(client, `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1
       FOR UPDATE`, [cardId]);
        if (cardResult.rows.length === 0) {
            throw new Error('Card not found');
        }
        const card = cardResult.rows[0];
        const now = new Date();
        // Enforce expiry check
        if (now > card.expires_at) {
            // Update state to Expired if not already
            if (card.state === 'Active') {
                await (0, db_1.queryInTransaction)(client, 'UPDATE cards SET state = $1, updated_at = now() WHERE id = $2', ['Expired', cardId]);
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
        let newState = 'Active';
        if (card.product === 'cycling_bonus') {
            newRemainingUses = card.remaining_uses - 1;
            if (newRemainingUses === 0) {
                newState = 'UsedUp';
            }
        }
        // Update card
        await (0, db_1.queryInTransaction)(client, `UPDATE cards 
       SET remaining_uses = $1, state = $2, updated_at = now()
       WHERE id = $3`, [newRemainingUses, newState, cardId]);
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
            await (0, db_1.queryInTransaction)(client, 'INSERT INTO idempotency_log (key, card_id, action, result, created_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (key) DO NOTHING', [idempotencyKey, cardId, 'deduct', JSON.stringify(result)]);
        }
        // Queue email notification
        const emailContent = (0, email_1.generateDeductionEmailContent)(card.member_display_name, card.serial, card.product, newRemainingUses, now);
        await (0, email_1.enqueueEmail)(card.member_email, emailContent.subject, emailContent.bodyText, emailContent.bodyHtml);
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
async function rollbackCard(cardId, staffId, reasonCode, note, idempotencyKey) {
    return (0, db_1.withTransaction)(async (client) => {
        // Check idempotency if key provided
        if (idempotencyKey) {
            const idempotencyResult = await (0, db_1.queryInTransaction)(client, 'SELECT key, card_id, action, result, created_at FROM idempotency_log WHERE key = $1 AND card_id = $2 AND action = $3', [idempotencyKey, cardId, 'rollback']);
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
        const cardResult = await (0, db_1.queryInTransaction)(client, `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1
       FOR UPDATE`, [cardId]);
        if (cardResult.rows.length === 0) {
            throw new Error('Card not found');
        }
        const card = cardResult.rows[0];
        let newRemainingUses = card.remaining_uses;
        let newState = card.state;
        if (card.product === 'cycling_bonus') {
            // Add one use back, but cap at maximum (11)
            newRemainingUses = Math.min((card.remaining_uses || 0) + 1, 11);
            // If card was UsedUp and now has uses, make it Active
            if (card.state === 'UsedUp' && newRemainingUses > 0) {
                newState = 'Active';
            }
        }
        // Update card
        await (0, db_1.queryInTransaction)(client, `UPDATE cards 
       SET remaining_uses = $1, state = $2, updated_at = now()
       WHERE id = $3`, [newRemainingUses, newState, cardId]);
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
            await (0, db_1.queryInTransaction)(client, 'INSERT INTO idempotency_log (key, card_id, action, result, created_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (key) DO NOTHING', [idempotencyKey, cardId, 'rollback', JSON.stringify(result)]);
        }
        // Queue email notification
        const emailContent = (0, email_1.generateRollbackEmailContent)(card.member_display_name, card.serial, card.product, newRemainingUses, new Date(), reasonCode);
        await (0, email_1.enqueueEmail)(card.member_email, emailContent.subject, emailContent.bodyText, emailContent.bodyHtml);
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
async function cancelCard(cardId, staffId, reasonCode, note) {
    return (0, db_1.withTransaction)(async (client) => {
        // Get current card state
        const cardResult = await (0, db_1.queryInTransaction)(client, `SELECT 
         c.id, c.member_id, c.serial, c.product, c.state, c.remaining_uses, c.expires_at,
         m.display_name as member_display_name, m.email as member_email
       FROM cards c
       JOIN members m ON c.member_id = m.id
       WHERE c.id = $1`, [cardId]);
        if (cardResult.rows.length === 0) {
            throw new Error('Card not found');
        }
        const card = cardResult.rows[0];
        // Update card to cancelled state
        await (0, db_1.queryInTransaction)(client, `UPDATE cards 
       SET state = 'Cancelled', updated_at = now()
       WHERE id = $1`, [cardId]);
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
