import { NextResponse } from 'next/server';
import { dispatchPhoneOtp } from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = body?.phoneNumber?.trim();

    if (!phoneNumber || phoneNumber.length < 10) {
      return NextResponse.json(
        { success: false, error: { message: 'A valid 11-digit phone number is required.' } },
        { status: 400 },
      );
    }

    const result = await dispatchPhoneOtp(phoneNumber);
    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        message: result.message,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send WhatsApp code.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
