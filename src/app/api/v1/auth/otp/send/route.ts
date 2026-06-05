import { NextResponse } from 'next/server';
import { generateAndSaveOtp } from '@/modules/auth/otp';
import { sendEmailOtp } from '@/modules/notifications/zeptomail';
import { sendSmsOtp } from '@/modules/notifications/termii';

export async function POST(req: Request) {
  try {
    const { target, type } = await req.json();

    if (!target || !['EMAIL', 'PHONE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Generate code and save to DB
    const code = await generateAndSaveOtp(target, type as 'EMAIL' | 'PHONE');

    // Dispatch via correct provider
    if (type === 'EMAIL') {
      await sendEmailOtp(target, code);
    } else {
      await sendSmsOtp(target, code);
    }

    return NextResponse.json({ success: true, message: 'OTP dispatched successfully' });
  } catch (error) {
    console.error('[OTP_SEND_ERROR]', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
