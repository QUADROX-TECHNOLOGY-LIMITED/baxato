import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const payload = await request.json();

    const result = await proxyToBackendApi('/services/education/pricing', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update pricing.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 },
    );
  }
}
