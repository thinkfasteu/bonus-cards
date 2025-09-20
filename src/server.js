"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const db_1 = require("./db");
const cards_1 = __importDefault(require("./routes/cards"));
const admin_1 = __importDefault(require("./routes/admin"));
const reports_1 = __importDefault(require("./routes/reports"));
const emails_1 = __importDefault(require("./routes/emails"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path}`);
    next();
});
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbTime = await (0, db_1.dbHealth)();
        res.json({
            ok: true,
            dbTime: dbTime.toISOString()
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'Database connection failed'
        });
    }
});
// API Routes
app.use('/cards', cards_1.default);
app.use('/cards', admin_1.default); // Admin routes are nested under /cards/:cardId/...
app.use('/reports', reports_1.default);
app.use('/admin', emails_1.default); // Email admin routes
app.use('/admin', emails_1.default); // Email management routes
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        details: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});
// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    // Don't send error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
        error: 'Internal server error',
        ...(isDevelopment && { details: error.message, stack: error.stack })
    });
});
// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 FTG Sportfabrik Bonus Cards API Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}
exports.default = app;
