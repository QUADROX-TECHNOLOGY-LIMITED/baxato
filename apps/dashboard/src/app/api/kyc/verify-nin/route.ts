import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const payload = await request.json();

    const result = await proxyToBackendApi('/kyc/verify-nin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'NIN verification failed.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 },
    );
  }
}
