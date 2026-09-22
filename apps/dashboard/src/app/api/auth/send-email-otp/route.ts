import { NextResponse } from 'next/server';
import { dispatchEmailOtp } from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.toLowerCase()?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: { message: 'A valid email address is required.' } },
        { status: 400 },
      );
    }

    const result = await dispatchEmailOtp(email);
    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        message: result.message,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email verification code.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
