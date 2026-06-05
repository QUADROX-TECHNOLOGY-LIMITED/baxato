// src/modules/notifications/zeptomail.ts

import { EmailTemplates } from './templates';

export async function sendEmailOtp(toEmail: string, code: string) {
  // If your account is EU or IN, this might need to be .eu or .in
  const url = 'https://api.zeptomail.com/v1.1/email'; 
  const htmlBody = EmailTemplates.verificationOtp(code);

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

  console.log(`[ZEPTOMAIL_ATTEMPT] Sending to: ${toEmail} from: ${process.env.ZEPTO_SENDER_EMAIL}`);

  try {
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
      // 1. Await the exact string response from Zoho
      const errorText = await response.text();
      
      // 2. Log it massively so it's impossible to miss in Railway
      console.error('\n================ ZEPTOMAIL ERROR FATAL ================');
      console.error(`Status Code: ${response.status} ${response.statusText}`);
      console.error(`Response Body: ${errorText}`);
      console.error('========================================================\n');
      
      // 3. Throw the actual Zoho text so it bubbles up to route.ts
      throw new Error(`Zeptomail rejected payload: ${errorText}`);
    }

    const data = await response.json();
    console.log('[ZEPTOMAIL_SUCCESS]', data);
    return data;

  } catch (error: any) {
    // Catch fetch/network level errors (like wrong URL or DNS failure)
    console.error('\n================ ZEPTOMAIL CATCH BLOCK ================');
    console.error(error.message || error);
    console.error('=======================================================\n');
    throw error;
  }
}
