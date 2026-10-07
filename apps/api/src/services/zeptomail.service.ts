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

  /**
   * Helper to retrieve active password change OTP for testing or dev mode
   */
  public getActivePasswordChangeOtp(email: string): string | undefined {
    return this.otpStore.get(`pwd:${email.toLowerCase().trim()}`)?.code;
  }

  /**
   * Dispatches a secure 6-digit confirmation code via ZeptoMail for password change confirmation.
   */
  public async sendPasswordChangeOtp(
    email: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const normalized = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.otpStore.set(`pwd:${normalized}`, { code, expiresAt });

    const subject = `${code} is your BAXATO password change confirmation code`;
    const recipientName = name || 'Merchant';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0B1220; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #E2E8F0; background-color: #FFFFFF;">
      <h2 style="color: #126BEB; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">BAXATO</h2>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Security & Account Protection</p>
    </div>
    <div style="padding: 32px 28px; text-align: left;">
      <h3 style="margin-top: 0; font-size: 16px; color: #0F172A;">Password Change Confirmation</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Hello ${recipientName},<br />
        A request was submitted to change your BAXATO merchant account password. To authorize this change, please enter the following 6-digit confirmation code in your dashboard settings:
      </p>
      <div style="margin: 28px 0; background: #0F172A; border-radius: 8px; padding: 18px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; text-align: center;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
        This security code expires in <strong>10 minutes</strong>. If you did not initiate this request, your account credentials may be compromised. Please sign in and secure your account immediately.
      </p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94A3B8; margin-bottom: 0; text-align: center;">
        &copy; 2026 XATO TECHNOLOGIES LIMITED. Automated security notification.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail([{ email: normalized, name: recipientName }], subject, html);
  }

  /**
   * Validates password change confirmation code.
   */
  public verifyPasswordChangeOtp(email: string, code: string): { valid: boolean; reason?: string } {
    const normalized = email.toLowerCase().trim();
    const key = `pwd:${normalized}`;
    const record = this.otpStore.get(key);
    if (!record) {
      return { valid: false, reason: 'No password confirmation code requested for this email.' };
    }
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(key);
      return { valid: false, reason: 'Confirmation code has expired. Please request a new code.' };
    }
    if (record.code !== code.trim()) {
      return { valid: false, reason: 'Invalid confirmation code. Please check your email.' };
    }
    this.otpStore.delete(key);
    return { valid: true };
  }

  /**
   * Helper to retrieve active 2FA OTP for testing or dev mode
   */
  public getActiveTwoFactorOtp(email: string): string | undefined {
    return this.otpStore.get(`2fa:${email.toLowerCase().trim()}`)?.code;
  }

  /**
   * Dispatches a secure 6-digit confirmation code via ZeptoMail for Two-Factor Authentication (2FA).
   */
  public async sendTwoFactorOtp(
    email: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const normalized = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.otpStore.set(`2fa:${normalized}`, { code, expiresAt });

    const subject = `${code} is your BAXATO Two-Factor Authentication verification code`;
    const recipientName = name || 'Merchant';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0B1220; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #E2E8F0; background-color: #FFFFFF;">
      <h2 style="color: #126BEB; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">BAXATO</h2>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Two-Factor Authentication Security</p>
    </div>
    <div style="padding: 32px 24px; text-align: center;">
      <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0F172A;">Two-Factor Authentication Verification</h3>
      <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.5;">
        Hello ${recipientName},<br>
        Enter the 6-digit verification code below to verify and activate Two-Factor Authentication on your BAXATO merchant account:
      </p>
      <div style="background-color: #F1F5F9; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 18px; font-size: 32px; font-weight: 900; letter-spacing: 6px; font-family: monospace; color: #0F172A; display: inline-block; min-width: 200px;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #64748B; margin: 20px 0 0 0;">
        This code expires in 10 minutes. If you did not initiate this request, please change your account password immediately.
      </p>
    </div>
    <div style="padding: 16px 24px; text-align: center; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
      <p style="margin: 0; font-size: 11px; color: #94A3B8;">&copy; 2026 BAXATO Infrastructure. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail([{ email: normalized, name: recipientName }], subject, html);
  }

  /**
   * Validates Two-Factor Authentication email verification code.
   */
  public verifyTwoFactorOtp(email: string, code: string): { valid: boolean; reason?: string } {
    const normalized = email.toLowerCase().trim();
    const key = `2fa:${normalized}`;
    const record = this.otpStore.get(key);
    if (!record) {
      return { valid: false, reason: 'No two-factor verification code requested for this email.' };
    }
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(key);
      return { valid: false, reason: 'Verification code has expired. Please request a new code.' };
    }
    if (record.code !== code.trim()) {
      return { valid: false, reason: 'Invalid verification code. Please check your email.' };
    }
    this.otpStore.delete(key);
    return { valid: true };
  }

  /**
   * Dispatches a branded Team Invitation email with secure /invite/:token link.
   */
  async sendTeamInvitationEmail(params: {
    toEmail: string;
    inviterName: string;
    businessName: string;
    role: string;
    rawToken: string;
    expiresAt: Date;
  }): Promise<{ success: boolean; error?: string }> {
    const { toEmail, inviterName, businessName, role, rawToken, expiresAt } = params;
    const subject = `${inviterName} invited you to join ${businessName} on BAXATO`;
    const inviteUrl = `${env.DASHBOARD_URL || 'https://dashboard.baxato.com'}/invite/${encodeURIComponent(rawToken)}`;
    const formattedRole = role.replace('BUSINESS_', '').replace('_', ' ');
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0F1D; color: #E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0F1D; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #1E293B; background: linear-gradient(180deg, #131E36 0%, #0F172A 100%);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #38BDF8;">
                BAXATO
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                Enterprise Telecom & Utility Infrastructure
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px; color: #94A3B8; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 18px; font-weight: 600; color: #F8FAFC;">
                You've been invited to join <span style="color: #38BDF8; font-weight: 700;">${businessName}</span>!
              </p>
              <p style="color: #CBD5E1;">
                <strong>${inviterName}</strong> has invited you to collaborate as a team member on BAXATO with the following role:
              </p>
              
              <div style="margin: 24px 0; background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; font-weight: 600;">ASSIGNED ROLE</span>
                <h3 style="margin: 4px 0 0 0; font-size: 18px; color: #38BDF8; font-weight: 700;">${formattedRole}</h3>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; text-decoration: none; padding: 14px 36px; font-size: 15px; font-weight: 600; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                      Accept Invitation & Join Team
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #64748B; text-align: center; margin-bottom: 0;">
                This invitation link will expire on <strong>${expiryFormatted}</strong>. If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #0B1120; border-top: 1px solid #1E293B;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
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

    return this.sendEmail([{ email: toEmail.toLowerCase().trim(), name: toEmail }], subject, html);
  }
}

export const zeptoMailService = new ZeptoMailService();
