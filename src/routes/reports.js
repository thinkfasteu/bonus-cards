"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const csv_stringify_1 = require("csv-stringify");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// All report routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
// GET /reports/transactions - Export transaction report as CSV
router.get('/transactions', (0, validate_1.validate)({ query: validate_1.schemas.transactionReport }), async (req, res) => {
    try {
        const { from, to } = req.query;
        // Query transactions with joins to get readable data
        const result = await (0, db_1.query)(`SELECT 
           c.serial,
           s.username as staff_username,
           c.product,
           e.ts as timestamp,
           e.type as event_type,
           e.delta,
           e.reason_code
         FROM events e
         JOIN cards c ON e.card_id = c.id
         JOIN staff s ON e.staff_id = s.id
         WHERE e.ts >= $1 AND e.ts <= $2
         ORDER BY e.ts DESC`, [from, to]);
        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        // Create CSV stringifier
        const csvStringifier = (0, csv_stringify_1.stringify)({
            header: true,
            columns: [
                { key: 'serial', header: 'serial' },
                { key: 'staff_username', header: 'staff_username' },
                { key: 'product', header: 'product' },
                { key: 'timestamp', header: 'timestamp' },
                { key: 'event_type', header: 'event_type' },
                { key: 'delta', header: 'delta' },
                { key: 'reason_code', header: 'reason_code' }
            ]
        });
        // Pipe CSV data to response
        csvStringifier.pipe(res);
        // Write each row
        for (const row of result.rows) {
            csvStringifier.write({
                serial: row.serial,
                staff_username: row.staff_username,
                product: row.product,
                timestamp: row.timestamp.toISOString(),
                event_type: row.event_type,
                delta: row.delta,
                reason_code: row.reason_code || ''
            });
        }
        csvStringifier.end();
    }
    catch (error) {
        console.error('Transaction report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
