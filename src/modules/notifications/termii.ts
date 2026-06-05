// src/modules/notifications/termii.ts

export async function sendSmsOtp(toPhone: string, code: string) {
  const baseUrl = process.env.TERMII_BASE_URL;
  if (!baseUrl) throw new Error('TERMII_BASE_URL is not defined');

  // Termii requires international format without the '+' sign
  // e.g., 2348012345678
  const cleanPhone = toPhone.replace(/\D/g, ''); 

  const payload = {
    to: cleanPhone,
    from: process.env.TERMII_SENDER_ID,
    sms: `Your BAXATO code is ${code}. Valid for 10 mins.`,
    type: 'plain',
    channel: 'generic',
    api_key: process.env.TERMII_API_KEY,
  };

  const response = await fetch(`${baseUrl}/api/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Termii Error:', error);
    throw new Error('Failed to send SMS OTP');
  }

  return await response.json();
}
