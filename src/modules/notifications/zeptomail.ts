// src/modules/notifications/zeptomail.ts

import { EmailTemplates } from './templates';

export async function sendEmailOtp(toEmail: string, code: string) {
  const url = 'https://api.zeptomail.com/v1.1/email';
  const htmlBody = EmailTemplates.verificationOtp(code);

  // You must use the exact bounce address configured in your Zeptomail Domain settings.
  // We fall back to the sender email just in case, but ideally, you set ZEPTO_BOUNCE_EMAIL in your .env
  const bounceAddress = process.env.ZEPTO_BOUNCE_EMAIL || process.env.ZEPTO_SENDER_EMAIL;

  const payload = {
    bounce_address: bounceAddress,
    from: {
      address: process.env.ZEPTO_SENDER_EMAIL,
      name: process.env.ZEPTO_SENDER_NAME,
    },
    to: [
      { 
        email_address: { 
          address: toEmail 
        } 
      }
    ],
    subject: `${code} is your BAXATO verification code`,
    htmlbody: htmlBody,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // This will now print Zoho's exact error message to your Railway logs
    const errorText = await response.text();
    console.error('Zeptomail Detailed API Error:', errorText);
    throw new Error('Failed to send email OTP');
  }

  return await response.json();
}
