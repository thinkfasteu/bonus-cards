import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * SMTP Transport Factory for FTG Sportfabrik Email System
 * 
 * Creates and configures nodemailer transport based on environment variables.
 * Supports dry-run mode for development and testing.
 */

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  dryRun: boolean;
}

export interface HealthCheckResult {
  success: boolean;
  error?: string;
  connectionTime?: number;
}

/**
 * Load SMTP configuration from environment variables
 */
export function loadSMTPConfig(): SMTPConfig {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || '"Sportfabrik FTG" <noreply@sportfabrik-ftg.de>';
  const dryRun = process.env.EMAIL_DRY_RUN === 'true';

  // Validate required configuration in production mode
  if (!dryRun && (!host || !user || !pass)) {
    throw new Error(
      'SMTP configuration incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS. ' +
      'Set EMAIL_DRY_RUN=true for development mode.'
    );
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
export function createSMTPTransport(config?: SMTPConfig): Transporter {
  const smtpConfig = config || loadSMTPConfig();

  if (smtpConfig.dryRun) {
    console.log('📧 Email transport: DRY RUN mode (no actual emails sent)');
    // Create a test transport that doesn't actually send emails
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  console.log(`📧 Email transport: Connecting to ${smtpConfig.host}:${smtpConfig.port} (secure: ${smtpConfig.secure})`);

  const transportOptions: SMTPTransport.Options = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    },
    // Connection and timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,     // 5 seconds
    socketTimeout: 30000,      // 30 seconds
    // Enable debug logging if DEBUG env var is set
    debug: process.env.DEBUG?.includes('nodemailer') || false,
    logger: process.env.DEBUG?.includes('nodemailer') || false
  };

  return nodemailer.createTransport(transportOptions);
}

/**
 * Verify SMTP connection health without sending emails
 * 
 * @param transport - Optional transport instance (creates new one if not provided)
 * @returns Promise with health check result
 */
export async function healthCheckSMTP(transport?: Transporter): Promise<HealthCheckResult> {
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
    
    return {
      success: false,
      error: errorMessage
    };

  } finally {
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
let _transportInstance: Transporter | null = null;

export function getTransport(): Transporter {
  if (!_transportInstance) {
    _transportInstance = createSMTPTransport();
  }
  return _transportInstance;
}

/**
 * Close and reset the singleton transport
 * Useful for testing and graceful shutdown
 */
export function closeTransport(): void {
  if (_transportInstance) {
    _transportInstance.close();
    _transportInstance = null;
  }
}