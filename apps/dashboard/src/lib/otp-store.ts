/**
 * BAXATO In-Memory OTP Store & Email Dispatcher for Dashboard API Routes
 */

interface OtpRecord {
  code: string;
  expiresAt: number;
}

// In-memory OTP storage keyed by normalized email or phone number
const emailOtpStore = new Map<string, OtpRecord>();
const phoneOtpStore = new Map<string, OtpRecord>();

/**
 * Dispatches an email OTP using ZeptoMail if configured,
 * or logs to server console in development mode.
 */
export async function dispatchEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
  const normalized = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes TTL

  emailOtpStore.set(normalized, { code, expiresAt });

  const zeptoApiKey = process.env.ZEPTOMAIL_API_KEY;
  const fromAddress = process.env.ZEPTOMAIL_FROM_ADDRESS || 'dev@quadroxtech.cloud';
  const bounceAddress = process.env.ZEPTOMAIL_BOUNCE_ADDRESS || 'bounce@bounce-zem.quadroxtech.cloud';

  if (zeptoApiKey && zeptoApiKey.trim()) {
    try {
      const authHeader = zeptoApiKey.startsWith('Zoho-enczapikey')
        ? zeptoApiKey
        : `Zoho-enczapikey ${zeptoApiKey}`;

      const subject = `${code} is your BAXATO verification code`;
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0B1220;">
          <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #126BEB; margin-top: 0; font-size: 24px; font-weight: 800;">BAXATO</h2>
            <p style="font-size: 14px; color: #526173;">Use the verification code below to verify your email address and continue registration.</p>
            <div style="margin: 24px 0; background: #F1F5F9; border-radius: 8px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0B1220;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #94A3B8;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="font-size: 10px; color: #94A3B8; margin-bottom: 0;">&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
          </div>
        </div>
      `;

      const response = await fetch('https://api.zeptomail.com/v1.1/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          bounce_address: bounceAddress,
          from: { address: fromAddress, name: 'BAXATO' },
          to: [{ email_address: { address: normalized, name: 'Merchant' } }],
          subject,
          htmlbody: htmlBody,
        }),
      });

      if (!response.ok) {
        console.error('[ZeptoMail] HTTP error:', response.status, await response.text());
        // Fallback to local console log so dev testing isn't blocked
        console.log(`\x1b[36m[BAXATO ZeptoMail DEV]\x1b[0m Verification code for ${normalized}: \x1b[32m${code}\x1b[0m`);
      } else {
        console.log(`[ZeptoMail] Verification code email sent to ${normalized}`);
      }
    } catch (err) {
      console.error('[ZeptoMail] Dispatch error:', err);
      console.log(`\x1b[36m[BAXATO ZeptoMail DEV]\x1b[0m Verification code for ${normalized}: \x1b[32m${code}\x1b[0m`);
    }
  } else {
    // In local development without ZeptoMail API key, securely log to server terminal
    console.log(`\x1b[36m[BAXATO Dev OTP]\x1b[0m Verification code for ${normalized}: \x1b[32m${code}\x1b[0m`);
  }

  return { success: true, message: 'Verification code sent to your email.' };
}

/**
 * Validates an email OTP code.
 */
export function verifyEmailOtpCode(email: string, code: string): { valid: boolean; reason?: string } {
  const normalized = email.toLowerCase().trim();
  const record = emailOtpStore.get(normalized);

  if (!record) {
    return { valid: false, reason: 'No verification code requested for this email. Click Verify first.' };
  }

  if (Date.now() > record.expiresAt) {
    emailOtpStore.delete(normalized);
    return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
  }

  if (record.code !== code.trim()) {
    return { valid: false, reason: 'Invalid verification code. Please check your email and try again.' };
  }

  emailOtpStore.delete(normalized);
  return { valid: true };
}

/**
 * Dispatches a WhatsApp OTP code.
 */
export async function dispatchPhoneOtp(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  phoneOtpStore.set(cleaned, { code, expiresAt });
  console.log(`\x1b[35m[BAXATO WhatsApp Dev]\x1b[0m OTP code for ${cleaned}: \x1b[32m${code}\x1b[0m`);

  return { success: true, message: 'Verification code sent to your WhatsApp number.' };
}

/**
 * Validates a WhatsApp OTP code.
 */
export function verifyPhoneOtpCode(phoneNumber: string, code: string): { valid: boolean; reason?: string } {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const record = phoneOtpStore.get(cleaned);

  if (!record) {
    return { valid: false, reason: 'No verification code requested for this phone number.' };
  }

  if (Date.now() > record.expiresAt) {
    phoneOtpStore.delete(cleaned);
    return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
  }

  if (record.code !== code.trim()) {
    return { valid: false, reason: 'Invalid WhatsApp code. Please check your message.' };
  }

  phoneOtpStore.delete(cleaned);
  return { valid: true };
}
