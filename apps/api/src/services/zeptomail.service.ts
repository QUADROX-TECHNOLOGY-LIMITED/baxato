import { env } from '@baxato/config';

export interface EmailRecipient {
  email: string;
  name: string;
}

export class ZeptoMailService {
  private readonly apiUrl = 'https://api.zeptomail.com/v1.1/email';

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
