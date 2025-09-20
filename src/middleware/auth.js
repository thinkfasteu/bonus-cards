"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaff = exports.requireAdmin = void 0;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const db_1 = require("../db");
async function authenticate(req, res, next) {
    try {
        const username = req.headers['x-staff-username'];
        if (!username) {
            res.status(401).json({
                error: 'Authentication required',
                details: 'Header x-staff-username is required'
            });
            return;
        }
        // Load staff member from database
        const result = await (0, db_1.query)(`SELECT id, username, role, is_active 
       FROM staff 
       WHERE username = $1 AND is_active = true`, [username]);
        if (result.rows.length === 0) {
            res.status(401).json({
                error: 'Authentication failed',
                details: 'Invalid or inactive staff username'
            });
            return;
        }
        const staff = result.rows[0];
        req.staff = {
            staffId: staff.id,
            username: staff.username,
            role: staff.role,
            displayName: staff.username // Use username as display name since no separate field
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Internal server error during authentication'
        });
    }
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.staff) {
            res.status(401).json({
                error: 'Authentication required'
            });
            return;
        }
        if (!allowedRoles.includes(req.staff.role)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                details: `Role '${req.staff.role}' not authorized. Required: ${allowedRoles.join(' or ')}`
            });
            return;
        }
        next();
    };
}
// Convenience middleware for admin-only endpoints
exports.requireAdmin = requireRole(['admin']);
// Convenience middleware for both reception and admin
exports.requireStaff = requireRole(['reception', 'admin']);
