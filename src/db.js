"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.dbHealth = dbHealth;
exports.closeDb = closeDb;
exports.query = query;
exports.withTransaction = withTransaction;
exports.queryInTransaction = queryInTransaction;
require("dotenv/config");
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    // keep TLS on, but don't require a trusted CA (dev/pilot-friendly)
    ssl: { rejectUnauthorized: false }
});
async function dbHealth() {
    const r = await exports.pool.query('select now() as now');
    return r.rows[0].now;
}
async function closeDb() {
    await exports.pool.end();
}
// Query helper for parameterized queries
async function query(text, params) {
    return exports.pool.query(text, params);
}
// Transaction helper
async function withTransaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
// Query helper for use within transactions
async function queryInTransaction(client, text, params) {
    return client.query(text, params);
}
