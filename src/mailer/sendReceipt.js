"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDeductionReceipt = sendDeductionReceipt;
exports.validateReceiptPayload = validateReceiptPayload;
const transport_1 = require("./transport");
/**
 * Format UTC date to Europe/Berlin timezone
 */
function formatBerlinTime(utcDate, includeDate = true) {
    const options = {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit'
    };
    if (includeDate) {
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
    }
    return new Intl.DateTimeFormat('de-DE', options).format(utcDate);
}
/**
 * Format UTC date to Europe/Berlin date only
 */
function formatBerlinDate(utcDate) {
    return new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(utcDate);
}
/**
 * Generate German email subject
 */
function generateSubject(productLabel) {
    return `Sportfabrik – Besuch erfasst (${productLabel})`;
}
/**
 * Generate German email body (text format)
 */
function generateTextBody(payload) {
    const localTime = formatBerlinTime(payload.eventTimeUTC, false);
    const expiresLocal = formatBerlinDate(payload.expiresAtUTC);
    let body = `Hallo ${payload.memberDisplayName},

heute um ${localTime} wurde 1 Besuch erfasst.

Kartennummer: ${payload.serial}
Produkt: ${payload.productLabel}`;
    // Add remaining uses for bonus cards (not unlimited)
    if (payload.remainingUses !== null) {
        body += `\nRestguthaben: ${payload.remainingUses} von 11`;
    }
    body += `\nAblaufdatum: ${expiresLocal}

---

Diese E-Mail wurde automatisch generiert. Die Erfassung erfolgt im Rahmen unserer Leistungserbringung.

Bei Fragen erreichen Sie uns:
Telefon: [Platzhalter Telefonnummer]
E-Mail: [Platzhalter E-Mail]

Hinweis zum Datenschutz: Wir verarbeiten Ihre Daten ausschließlich zur Erbringung unserer Dienstleistung gemäß Art. 6 Abs. 1 lit. b DSGVO.

Sportfabrik FTG`;
    return body;
}
/**
 * Generate German email body (HTML format)
 */
function generateHtmlBody(payload) {
    const localTime = formatBerlinTime(payload.eventTimeUTC, false);
    const expiresLocal = formatBerlinDate(payload.expiresAtUTC);
    let usageInfo = '';
    if (payload.remainingUses !== null) {
        usageInfo = `
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">Restguthaben:</td>
        <td style="padding: 4px 0;">${payload.remainingUses} von 11</td>
      </tr>`;
    }
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Besuch erfasst - Sportfabrik FTG</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c5530; margin-top: 0;">Besuch erfasst</h2>
    
    <p>Hallo <strong>${payload.memberDisplayName}</strong>,</p>
    
    <p>heute um <strong>${localTime}</strong> wurde 1 Besuch erfasst.</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Kartennummer:</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${payload.serial}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Produkt:</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${payload.productLabel}</td>
    </tr>
    ${usageInfo}
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Ablaufdatum:</td>
      <td style="padding: 8px 0;">${expiresLocal}</td>
    </tr>
  </table>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <div style="font-size: 12px; color: #666; line-height: 1.4;">
    <p><em>Diese E-Mail wurde automatisch generiert. Die Erfassung erfolgt im Rahmen unserer Leistungserbringung.</em></p>
    
    <p><strong>Bei Fragen erreichen Sie uns:</strong><br>
    Telefon: [Platzhalter Telefonnummer]<br>
    E-Mail: [Platzhalter E-Mail]</p>
    
    <p><strong>Hinweis zum Datenschutz:</strong> Wir verarbeiten Ihre Daten ausschließlich zur Erbringung unserer Dienstleistung gemäß Art. 6 Abs. 1 lit. b DSGVO.</p>
    
    <p style="margin-top: 20px; font-weight: bold; color: #2c5530;">Sportfabrik FTG</p>
  </div>

</body>
</html>`;
}
/**
 * Send deduction receipt email
 *
 * @param options - Send options including recipient, locale, and payload data
 * @returns Promise with send result including messageId
 */
async function sendDeductionReceipt(options) {
    const { to, payload, transport } = options;
    const locale = options.locale || 'de';
    // Currently only German locale supported
    if (locale !== 'de') {
        return {
            messageId: '',
            success: false,
            error: `Unsupported locale: ${locale}. Only 'de' is currently supported.`
        };
    }
    try {
        // Use provided transport or get singleton
        const emailTransport = transport || (0, transport_1.getTransport)();
        // Get sender address from environment
        const fromAddress = process.env.EMAIL_FROM || '"Sportfabrik FTG" <noreply@sportfabrik-ftg.de>';
        // Generate email content
        const subject = generateSubject(payload.productLabel);
        const textBody = generateTextBody(payload);
        const htmlBody = generateHtmlBody(payload);
        // Check for dry-run mode
        const isDryRun = process.env.EMAIL_DRY_RUN === 'true';
        if (isDryRun) {
            console.log(`📧 DRY RUN: Would send email to ${to}`);
            console.log(`   Subject: ${subject}`);
            console.log(`   Card: ${payload.serial} (${payload.productLabel})`);
            return {
                messageId: `dry-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                success: true
            };
        }
        // Send the email
        const result = await emailTransport.sendMail({
            from: fromAddress,
            to: to,
            subject: subject,
            text: textBody,
            html: htmlBody,
            // Email headers for better deliverability
            headers: {
                'X-Mailer': 'FTG Sportfabrik Digital Cards v1.0',
                'X-Priority': '3', // Normal priority
                'X-MSMail-Priority': 'Normal'
            }
        });
        console.log(`📧 Email sent successfully to ${to} (messageId: ${result.messageId})`);
        return {
            messageId: result.messageId || `sent-${Date.now()}`,
            success: true
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown email sending error';
        console.error(`📧 Failed to send email to ${to}:`, errorMessage);
        return {
            messageId: '',
            success: false,
            error: errorMessage
        };
    }
}
/**
 * Validate receipt payload for completeness
 */
function validateReceiptPayload(payload) {
    const errors = [];
    if (!payload.memberDisplayName?.trim()) {
        errors.push('memberDisplayName is required');
    }
    if (!payload.productLabel?.trim()) {
        errors.push('productLabel is required');
    }
    if (!payload.serial?.trim()) {
        errors.push('serial is required');
    }
    if (!payload.eventTimeUTC || !(payload.eventTimeUTC instanceof Date)) {
        errors.push('eventTimeUTC must be a valid Date');
    }
    if (!payload.expiresAtUTC || !(payload.expiresAtUTC instanceof Date)) {
        errors.push('expiresAtUTC must be a valid Date');
    }
    // remainingUses can be null (for unlimited) or a non-negative number
    if (payload.remainingUses !== null && (typeof payload.remainingUses !== 'number' || payload.remainingUses < 0)) {
        errors.push('remainingUses must be null or a non-negative number');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
