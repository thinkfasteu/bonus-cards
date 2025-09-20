"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const uuid_1 = require("uuid");
const server_1 = __importDefault(require("../src/server"));
const db_1 = require("../src/db");
// Test data
const testMemberId = (0, uuid_1.v4)();
const testAdminStaffId = (0, uuid_1.v4)();
const testReceptionStaffId = (0, uuid_1.v4)();
describe('Card Lifecycle E2E Test', () => {
    let cardId;
    beforeAll(async () => {
        // Seed test data
        await seedTestData();
    });
    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();
        await (0, db_1.closeDb)();
    });
    describe('Happy Path: Issue → Deduct → Rollback', () => {
        it('should issue a cycling_bonus card', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/cards')
                .set('x-staff-username', 'test_reception')
                .send({
                memberId: testMemberId,
                product: 'cycling_bonus'
            })
                .expect(201);
            expect(response.body).toMatchObject({
                memberDisplayName: 'Test Member',
                product: 'cycling_bonus',
                state: 'Active',
                remainingUses: 11
            });
            expect(response.body.cardId).toBeDefined();
            expect(response.body.serial).toMatch(/^BC-\d{4}-\d{6}$/);
            expect(response.body.expiresAt).toBeDefined();
            cardId = response.body.cardId;
        });
        it('should get card details', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/cards/${cardId}`)
                .set('x-staff-username', 'test_reception')
                .expect(200);
            expect(response.body).toMatchObject({
                cardId,
                memberDisplayName: 'Test Member',
                product: 'cycling_bonus',
                state: 'Active',
                remainingUses: 11
            });
        });
        it('should deduct card usage (reception staff)', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/cards/${cardId}/deduct`)
                .set('x-staff-username', 'test_reception')
                .send({ confirm: true })
                .expect(200);
            expect(response.body).toMatchObject({
                cardId,
                memberDisplayName: 'Test Member',
                product: 'cycling_bonus',
                state: 'Active',
                remainingUses: 10
            });
            // Verify an event was logged
            const eventResult = await (0, db_1.query)('SELECT * FROM events WHERE card_id = $1 AND type = $2', [cardId, 'Deduct']);
            expect(eventResult.rows).toHaveLength(1);
            expect(eventResult.rows[0].delta).toBe(-1);
            // Verify email was queued
            const emailResult = await (0, db_1.query)('SELECT * FROM email_receipts WHERE to_email = $1 AND status = $2', ['test@example.com', 'Queued']);
            expect(emailResult.rows.length).toBeGreaterThan(0);
        });
        it('should rollback deduction (admin staff)', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/cards/${cardId}/rollback`)
                .set('x-staff-username', 'test_admin')
                .send({
                reasonCode: 'MISTAKE',
                note: 'Test rollback for automation'
            })
                .expect(200);
            expect(response.body).toMatchObject({
                cardId,
                memberDisplayName: 'Test Member',
                product: 'cycling_bonus',
                state: 'Active',
                remainingUses: 11
            });
            // Verify rollback event was logged
            const eventResult = await (0, db_1.query)('SELECT * FROM events WHERE card_id = $1 AND type = $2', [cardId, 'Rollback']);
            expect(eventResult.rows).toHaveLength(1);
            expect(eventResult.rows[0].delta).toBe(1);
            expect(eventResult.rows[0].reason_code).toBe('MISTAKE');
        });
        it('should verify final card state', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/cards/${cardId}`)
                .set('x-staff-username', 'test_admin')
                .expect(200);
            expect(response.body).toMatchObject({
                cardId,
                remainingUses: 11,
                state: 'Active'
            });
        });
    });
    describe('Error Cases', () => {
        it('should reject unauthenticated requests', async () => {
            await (0, supertest_1.default)(server_1.default)
                .get(`/cards/${cardId}`)
                .expect(401);
        });
        it('should reject invalid staff username', async () => {
            await (0, supertest_1.default)(server_1.default)
                .get(`/cards/${cardId}`)
                .set('x-staff-username', 'invalid_user')
                .expect(401);
        });
        it('should reject non-admin rollback attempts', async () => {
            await (0, supertest_1.default)(server_1.default)
                .post(`/cards/${cardId}/rollback`)
                .set('x-staff-username', 'test_reception')
                .send({
                reasonCode: 'MISTAKE'
            })
                .expect(403);
        });
        it('should reject invalid card ID', async () => {
            await (0, supertest_1.default)(server_1.default)
                .get('/cards/invalid-uuid')
                .set('x-staff-username', 'test_reception')
                .expect(400);
        });
        it('should return 404 for non-existent card', async () => {
            const fakeCardId = (0, uuid_1.v4)();
            await (0, supertest_1.default)(server_1.default)
                .get(`/cards/${fakeCardId}`)
                .set('x-staff-username', 'test_reception')
                .expect(404);
        });
        it('should reject deduction without confirm=true', async () => {
            await (0, supertest_1.default)(server_1.default)
                .post(`/cards/${cardId}/deduct`)
                .set('x-staff-username', 'test_reception')
                .send({ confirm: false })
                .expect(400);
        });
    });
});
// Helper functions
async function seedTestData() {
    // Create test member
    await (0, db_1.query)(`INSERT INTO members (id, display_name, email, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (id) DO NOTHING`, [testMemberId, 'Test Member', 'test@example.com']);
    // Create test staff
    await (0, db_1.query)(`INSERT INTO staff (id, username, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())
     ON CONFLICT (username) DO NOTHING`, [testAdminStaffId, 'test_admin', 'admin']);
    await (0, db_1.query)(`INSERT INTO staff (id, username, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())
     ON CONFLICT (username) DO NOTHING`, [testReceptionStaffId, 'test_reception', 'reception']);
    // Ensure app config exists
    await (0, db_1.query)(`INSERT INTO app_config (key, value, updated_at)
     VALUES ('bonus_expiry_months', '12', now())
     ON CONFLICT (key) DO NOTHING`);
}
async function cleanupTestData() {
    // Clean up in reverse dependency order
    await (0, db_1.query)('DELETE FROM events WHERE card_id IN (SELECT id FROM cards WHERE member_id = $1)', [testMemberId]);
    await (0, db_1.query)('DELETE FROM email_receipts WHERE to_email = $1', ['test@example.com']);
    await (0, db_1.query)('DELETE FROM cards WHERE member_id = $1', [testMemberId]);
    await (0, db_1.query)('DELETE FROM members WHERE id = $1', [testMemberId]);
    await (0, db_1.query)('DELETE FROM staff WHERE id IN ($1, $2)', [testAdminStaffId, testReceptionStaffId]);
}
