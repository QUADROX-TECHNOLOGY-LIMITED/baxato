import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/modules/auth/otp';

export async function POST(req: Request) {
  try {
    const { target, type, code } = await req.json();

    if (!target || !code || !['EMAIL', 'PHONE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const isValid = await verifyOtpCode(target, type as 'EMAIL' | 'PHONE', code);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('[OTP_VERIFY_ERROR]', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
