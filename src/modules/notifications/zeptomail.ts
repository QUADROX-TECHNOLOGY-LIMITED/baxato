// src/modules/notifications/zeptomail.ts

import { EmailTemplates } from './templates';

export async function sendEmailOtp(toEmail: string, code: string) {
  const url = 'https://api.zeptomail.com/v1.1/email';
  const htmlBody = EmailTemplates.verificationOtp(code);

  const payload = {
    from: {
      address: process.env.ZEPTO_SENDER_EMAIL,
      name: process.env.ZEPTO_SENDER_NAME,
    },
    to: [{ email_address: { address: toEmail } }],
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
    const error = await response.text();
    console.error('Zeptomail Error:', error);
    throw new Error('Failed to send email OTP');
  }

  return await response.json();
}
