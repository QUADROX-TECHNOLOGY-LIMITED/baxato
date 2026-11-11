import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const forward = new URLSearchParams();
    if (limit) forward.set('limit', limit);
    if (offset) forward.set('offset', offset);
    const qs = forward.toString();

    const result = await proxyToBackendApi(qs ? `/services/data/history?${qs}` : '/services/data/history', {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve data purchase history.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

