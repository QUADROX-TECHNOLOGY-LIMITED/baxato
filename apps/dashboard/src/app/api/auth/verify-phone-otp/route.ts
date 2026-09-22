import { NextResponse } from 'next/server';
import { verifyPhoneOtpCode } from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = body?.phoneNumber?.trim();
    const otp = body?.otp?.trim();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { success: false, error: { message: 'Phone number and 6-digit OTP code are required.' } },
        { status: 400 },
      );
    }

    const verification = verifyPhoneOtpCode(phoneNumber, otp);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: { message: verification.reason || 'Invalid verification code.' } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        message: 'Phone number verified successfully.',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify phone code.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
