// src/modules/notifications/zeptomail.ts

import { EmailTemplates } from './templates';

export async function sendEmailOtp(toEmail: string, code: string) {
  // 1. SAFETY SHIELD: Check env variables BEFORE sending
  const apiKey = process.env.ZEPTO_API_KEY;
  const senderEmail = process.env.ZEPTO_SENDER_EMAIL;
  const senderName = process.env.ZEPTO_SENDER_NAME || 'BAXATO';
  const bounceEmail = process.env.ZEPTO_BOUNCE_EMAIL || senderEmail;

  if (!apiKey || !senderEmail) {
    console.error('MISSING ENV VARS: API Key or Sender Email is missing.');
    throw new Error('Server misconfiguration: Email provider keys missing.');
  }

  // 2. REGION CHECK: Change this to api.zeptomail.eu or api.zeptomail.in if your Zoho account is outside the US
  const url = 'https://api.zeptomail.com/v1.1/email'; 
  const htmlBody = EmailTemplates.verificationOtp(code);

  const payload = {
    bounce_address: bounceEmail,
    from: {
      address: senderEmail,
      name: senderName,
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

  console.log(`[ZEPTOMAIL_ATTEMPT] Sending to: ${toEmail} from: ${senderEmail} with bounce: ${bounceEmail}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Zoho-enczapikey ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n================ ZEPTOMAIL ERROR FATAL ================');
      console.error(`Status Code: ${response.status} ${response.statusText}`);
      console.error(`Response Body: ${errorText}`);
      console.error('========================================================\n');
      throw new Error(`Zeptomail rejected payload: ${errorText}`);
    }

    const data = await response.json();
    console.log('[ZEPTOMAIL_SUCCESS]', data);
    return data;

  } catch (error: any) {
    console.error('\n================ ZEPTOMAIL CATCH BLOCK ================');
    console.error(error.message || error);
    console.error('=======================================================\n');
    throw error;
  }
}
