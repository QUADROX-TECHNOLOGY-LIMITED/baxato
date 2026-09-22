import { NextResponse } from 'next/server';
import { verifyEmailOtpCode } from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.toLowerCase()?.trim();
    const otp = body?.otp?.trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and 6-digit OTP code are required.' } },
        { status: 400 },
      );
    }

    const verification = verifyEmailOtpCode(email, otp);

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
        message: 'Email address verified successfully.',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify code.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
