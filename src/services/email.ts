import { query } from '../db';

interface EmailReceiptRow {
  id: string;
}

export interface EmailReceipt {
  receiptId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: 'Queued' | 'Sent' | 'Failed';
}

export async function enqueueEmail(
  toEmail: string,
  subject: string,
  bodyText: string,
  bodyHtml?: string
): Promise<string> {
  // Note: The current email_receipts table doesn't have subject/body columns
  // For now, we'll just insert the basic info and log the email content
  console.log(`[EMAIL QUEUE] To: ${toEmail}, Subject: ${subject}`);
  console.log(`[EMAIL BODY] ${bodyText}`);
  
  const result = await query<EmailReceiptRow>(
    `INSERT INTO email_receipts (to_email, status, created_at)
     VALUES ($1, 'Queued', now())
     RETURNING id`,
    [toEmail]
  );

  return result.rows[0].id;
}

// Email templates in German (user-facing)
export function generateDeductionEmailContent(
  memberDisplayName: string,
  cardSerial: string,
  product: string,
  remainingUses: number | null,
  deductedAt: Date
): { subject: string; bodyText: string; bodyHtml: string } {
  const productName = product === 'cycling_bonus' ? 'Bonus-Karte Fahrrad' : 'Unlimited-Karte Fahrrad';
  
  const subject = `Bonuskarte verwendet - ${cardSerial}`;
  
  const remainingText = remainingUses !== null 
    ? `Verbleibende Nutzungen: ${remainingUses}`
    : 'Unlimited-Karte (unbegrenzte Nutzungen)';

  const bodyText = `
Hallo ${memberDisplayName},

Ihre ${productName} wurde erfolgreich verwendet.

Karte: ${cardSerial}
Verwendet am: ${deductedAt.toLocaleDateString('de-DE')} um ${deductedAt.toLocaleTimeString('de-DE')}
${remainingText}

Vielen Dank für Ihren Besuch bei der FTG Sportfabrik!

Mit freundlichen Grüßen
Ihr FTG Sportfabrik Team
  `.trim();

  const bodyHtml = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #2c5530;">Bonuskarte verwendet</h2>
  
  <p>Hallo <strong>${memberDisplayName}</strong>,</p>
  
  <p>Ihre <strong>${productName}</strong> wurde erfolgreich verwendet.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Karte:</strong> ${cardSerial}</p>
    <p><strong>Verwendet am:</strong> ${deductedAt.toLocaleDateString('de-DE')} um ${deductedAt.toLocaleTimeString('de-DE')}</p>
    <p><strong>${remainingText}</strong></p>
  </div>
  
  <p>Vielen Dank für Ihren Besuch bei der FTG Sportfabrik!</p>
  
  <p style="margin-top: 30px;">
    Mit freundlichen Grüßen<br>
    <strong>Ihr FTG Sportfabrik Team</strong>
  </p>
</body>
</html>
  `.trim();

  return { subject, bodyText, bodyHtml };
}

export function generateRollbackEmailContent(
  memberDisplayName: string,
  cardSerial: string,
  product: string,
  remainingUses: number | null,
  rolledBackAt: Date,
  reasonCode: string
): { subject: string; bodyText: string; bodyHtml: string } {
  const productName = product === 'cycling_bonus' ? 'Bonus-Karte Fahrrad' : 'Unlimited-Karte Fahrrad';
  
  const subject = `Korrektur Bonuskarte - ${cardSerial}`;
  
  const remainingText = remainingUses !== null 
    ? `Verbleibende Nutzungen: ${remainingUses}`
    : 'Unlimited-Karte (unbegrenzte Nutzungen)';

  const reasonText = {
    'MISTAKE': 'Versehentliche Abbuchung',
    'FRAUD_SUSPECTED': 'Verdacht auf Betrug',
    'CARD_LOST': 'Karte verloren/gestohlen',
    'OTHER': 'Sonstiger Grund'
  }[reasonCode] || 'Korrektur erforderlich';

  const bodyText = `
Hallo ${memberDisplayName},

Eine Abbuchung von Ihrer ${productName} wurde korrigiert.

Karte: ${cardSerial}
Korrigiert am: ${rolledBackAt.toLocaleDateString('de-DE')} um ${rolledBackAt.toLocaleTimeString('de-DE')}
Grund: ${reasonText}
${remainingText}

Bei Fragen wenden Sie sich bitte an unser Personal.

Mit freundlichen Grüßen
Ihr FTG Sportfabrik Team
  `.trim();

  const bodyHtml = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #2c5530;">Korrektur Bonuskarte</h2>
  
  <p>Hallo <strong>${memberDisplayName}</strong>,</p>
  
  <p>Eine Abbuchung von Ihrer <strong>${productName}</strong> wurde korrigiert.</p>
  
  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <p><strong>Karte:</strong> ${cardSerial}</p>
    <p><strong>Korrigiert am:</strong> ${rolledBackAt.toLocaleDateString('de-DE')} um ${rolledBackAt.toLocaleTimeString('de-DE')}</p>
    <p><strong>Grund:</strong> ${reasonText}</p>
    <p><strong>${remainingText}</strong></p>
  </div>
  
  <p>Bei Fragen wenden Sie sich bitte an unser Personal.</p>
  
  <p style="margin-top: 30px;">
    Mit freundlichen Grüßen<br>
    <strong>Ihr FTG Sportfabrik Team</strong>
  </p>
</body>
</html>
  `.trim();

  return { subject, bodyText, bodyHtml };
}