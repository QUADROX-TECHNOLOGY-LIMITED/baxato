import { env } from '@baxato/config';

export interface EmailRecipient {
  email: string;
  name: string;
}

export class ZeptoMailService {
  private readonly apiUrl = 'https://api.zeptomail.com/v1.1/email';
  private otpStore = new Map<string, { code: string; expiresAt: number }>();

  /**
   * Dispatches a transactional email via ZeptoMail API v1.1.
   */
  async sendEmail(
    to: EmailRecipient[],
    subject: string,
    htmlBody: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const rawKey = String(env.ZEPTOMAIL_API_KEY || '').trim();

    if (!rawKey) {
      // In development or test environments without API key, simulate success
      return { success: true, messageId: 'simulated-dev-msg-id' };
    }

    const authHeader = rawKey.startsWith('Zoho-enczapikey') ? rawKey : `Zoho-enczapikey ${rawKey}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          bounce_address: env.ZEPTOMAIL_BOUNCE_ADDRESS,
          from: {
            address: env.ZEPTOMAIL_FROM_ADDRESS,
            name: env.ZEPTOMAIL_FROM_NAME,
          },
          to: to.map((r) => ({
            email_address: {
              address: r.email,
              name: r.name,
            },
          })),
          subject,
          htmlbody: htmlBody,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `ZeptoMail dispatch failed [${response.status}]: ${errorText || 'Empty response body'}`,
        };
      }

      const data = (await response.json()) as { data?: Array<{ message_id?: string }> };
      const messageId = data?.data?.[0]?.message_id;
      return { success: true, messageId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * Generates a 6-digit numeric OTP and caches with 10 minutes expiry.
   */
  public generateOtp(email: string): string {
    const normalized = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.otpStore.set(normalized, { code, expiresAt });
    return code;
  }

  /**
   * Validates email OTP code.
   */
  public verifyOtp(email: string, code: string): { valid: boolean; reason?: string } {
    const normalized = email.toLowerCase().trim();
    const record = this.otpStore.get(normalized);
    if (!record) {
      return { valid: false, reason: 'No verification code requested for this email.' };
    }
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(normalized);
      return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
    }
    if (record.code !== code.trim()) {
      return { valid: false, reason: 'Invalid verification code.' };
    }
    this.otpStore.delete(normalized);
    return { valid: true };
  }

  /**
   * Helper to retrieve active OTP for testing or dev mode
   */
  public getActiveOtp(email: string): string | undefined {
    return this.otpStore.get(email.toLowerCase().trim())?.code;
  }

  /**
   * Dispatches email OTP code.
   */
  public async sendOtp(email: string, name?: string): Promise<{ success: boolean; error?: string }> {
    const code = this.generateOtp(email);
    const subject = `${code} is your BAXATO verification code`;
    const recipientName = name || 'Merchant';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: Arial, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0B1220;">
  <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px; text-align: center;">
    <h2 style="color: #126BEB; margin-top: 0;">BAXATO</h2>
    <p style="font-size: 14px; color: #526173;">Use the verification code below to confirm your email address.</p>
    <div style="margin: 24px 0; background: #F1F5F9; border-radius: 8px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0B1220;">
      ${code}
    </div>
    <p style="font-size: 12px; color: #94A3B8;">This code is valid for 10 minutes. If you did not request this, please ignore.</p>
    <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
    <p style="font-size: 10px; color: #94A3B8; margin-bottom: 0;">&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
  </div>
</body>
</html>
    `;
    return this.sendEmail([{ email: email.toLowerCase().trim(), name: recipientName }], subject, html);
  }

  /**
   * Generates and dispatches an account verification email upon registration.
   */
  async sendVerificationEmail(
    toEmail: string,
    name: string,
    verificationToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Verify your BAXATO Account';
    const verifyUrl = `${env.DASHBOARD_URL || 'https://dashboard.baxato.com'}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0B1220;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #E2E8F0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #126BEB;">
                BAXATO
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #526173; text-transform: uppercase; letter-spacing: 1px;">
                Enterprise VTU & Telecom Infrastructure
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px; color: #526173; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 18px; font-weight: 700; color: #0B1220;">
                Welcome, ${name}!
              </p>
              <p>
                Thank you for creating an account on BAXATO. To complete your registration and activate your merchant operations, please verify your email address.
              </p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="background-color: #126BEB; color: #FFFFFF; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; display: inline-block;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #94A3B8; margin-bottom: 0;">
                If you did not register for a BAXATO account, please ignore this email or reach out to support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail([{ email: toEmail, name }], subject, html);
  }
}

export const zeptoMailService = new ZeptoMailService();
