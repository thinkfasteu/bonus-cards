"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSMTPConfig = loadSMTPConfig;
exports.createSMTPTransport = createSMTPTransport;
exports.healthCheckSMTP = healthCheckSMTP;
exports.getTransport = getTransport;
exports.closeTransport = closeTransport;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Load SMTP configuration from environment variables
 */
function loadSMTPConfig() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || '"Sportfabrik FTG" <noreply@sportfabrik-ftg.de>';
    const dryRun = process.env.EMAIL_DRY_RUN === 'true';
    // Validate required configuration in production mode
    if (!dryRun && (!host || !user || !pass)) {
        throw new Error('SMTP configuration incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS. ' +
            'Set EMAIL_DRY_RUN=true for development mode.');
    }
    return {
        host: host || 'localhost',
        port,
        secure,
        user: user || '',
        pass: pass || '',
        from,
        dryRun
    };
}
/**
 * Create nodemailer transport instance
 */
function createSMTPTransport(config) {
    const smtpConfig = config || loadSMTPConfig();
    if (smtpConfig.dryRun) {
        console.log('📧 Email transport: DRY RUN mode (no actual emails sent)');
        // Create a test transport that doesn't actually send emails
        return nodemailer_1.default.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
        });
    }
    console.log(`📧 Email transport: Connecting to ${smtpConfig.host}:${smtpConfig.port} (secure: ${smtpConfig.secure})`);
    const transportOptions = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        },
        // Connection and timeout settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000, // 5 seconds
        socketTimeout: 30000, // 30 seconds
        // Enable debug logging if DEBUG env var is set
        debug: process.env.DEBUG?.includes('nodemailer') || false,
        logger: process.env.DEBUG?.includes('nodemailer') || false
    };
    return nodemailer_1.default.createTransport(transportOptions);
}
/**
 * Verify SMTP connection health without sending emails
 *
 * @param transport - Optional transport instance (creates new one if not provided)
 * @returns Promise with health check result
 */
async function healthCheckSMTP(transport) {
    let createdTransport = false;
    let testTransport = transport;
    try {
        if (!testTransport) {
            const config = loadSMTPConfig();
            // Skip health check in dry-run mode
            if (config.dryRun) {
                return {
                    success: true,
                    connectionTime: 0
                };
            }
            testTransport = createSMTPTransport(config);
            createdTransport = true;
        }
        const startTime = Date.now();
        // Verify SMTP connection
        await testTransport.verify();
        const connectionTime = Date.now() - startTime;
        return {
            success: true,
            connectionTime
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
        return {
            success: false,
            error: errorMessage
        };
    }
    finally {
        // Clean up transport if we created it
        if (createdTransport && testTransport) {
            testTransport.close();
        }
    }
}
/**
 * Get singleton transport instance for the application
 * Creates and caches the transport on first use
 */
let _transportInstance = null;
function getTransport() {
    if (!_transportInstance) {
        _transportInstance = createSMTPTransport();
    }
    return _transportInstance;
}
/**
 * Close and reset the singleton transport
 * Useful for testing and graceful shutdown
 */
function closeTransport() {
    if (_transportInstance) {
        _transportInstance.close();
        _transportInstance = null;
    }
}
