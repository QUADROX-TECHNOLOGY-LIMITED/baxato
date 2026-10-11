import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const body = await request.json().catch(() => ({}));
    const result = await proxyToBackendApi('/admin/providers/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Provider connectivity test failed.';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
