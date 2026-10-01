import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const idempotencyKey = request.headers.get('x-idempotency-key') || '';
    const payload = await request.json();

    const result = await proxyToBackendApi('/services/electricity/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Electricity purchase request failed.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 },
    );
  }
}
