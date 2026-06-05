// src/modules/notifications/zeptomail.ts

import { EmailTemplates } from './templates';

export async function sendEmailOtp(toEmail: string, code: string) {
  const url = 'https://api.zeptomail.com/v1.1/email'; 

  // 1. Strict Environment Variable Validation
  if (!process.env.ZEPTO_API_KEY) throw new Error("Missing ZEPTO_API_KEY");
  if (!process.env.ZEPTO_SENDER_EMAIL) throw new Error("Missing ZEPTO_SENDER_EMAIL");

  // 2. Clean the API key in case the user copied "Zoho-enczapikey " into the .env variable
  const rawKey = process.env.ZEPTO_API_KEY.trim();
  const cleanKey = rawKey.startsWith('Zoho-enczapikey ') 
    ? rawKey.replace('Zoho-enczapikey ', '') 
    : rawKey;

  const htmlBody = EmailTemplates.verificationOtp(code);

  // 3. Simplified Payload (Removed bounce_address to rely on Zeptomail's default dashboard config)
  const payload = {
    from: {
      address: process.env.ZEPTO_SENDER_EMAIL.trim(),
      name: process.env.ZEPTO_SENDER_NAME?.trim() || 'BAXATO',
    },
    to: [
      { 
        email_address: { 
          address: toEmail.trim() 
        } 
      }
    ],
    subject: `${code} is your BAXATO verification code`,
    htmlbody: htmlBody,
  };

  console.log(`[ZEPTOMAIL_ATTEMPT] Sending email from ${payload.from.address} to ${toEmail}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Zoho-enczapikey ${cleanKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ZEPTOMAIL_HTTP_ERROR] Status: ${response.status} | Body: ${errorText}`);
      throw new Error(`Zeptomail rejected payload (Status ${response.status})`);
    }

    const data = await response.json();
    console.log('[ZEPTOMAIL_SUCCESS]', data.message);
    return data;

  } catch (error: any) {
    console.error('[ZEPTOMAIL_CATCH_ERROR]', error.message || error);
    throw error;
  }
}
