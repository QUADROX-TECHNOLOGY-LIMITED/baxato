// src/modules/notifications/templates.ts

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOGO_URL = `${APP_URL}/baxato-logo.png`;
const BRAND_COLOR = '#1c44e4';

export const EmailTemplates = {
  /**
   * Standard Verification OTP Email
   */
  verificationOtp: (code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="BAXATO" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Verify Your Email Address</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.5;">
          Please use the verification code below to complete your BAXATO registration. This code will expire in 10 minutes.
        </p>
        <div style="margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: ${BRAND_COLOR}; background-color: #ffffff; padding: 15px 25px; border-radius: 6px; border: 1px dashed ${BRAND_COLOR}; display: inline-block;">
            ${code}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">
          If you did not request this code, please ignore this email.
        </p>
      </div>
    </div>
  `,
};
