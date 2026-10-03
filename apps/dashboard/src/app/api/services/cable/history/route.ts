import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const result = await proxyToBackendApi(`/services/cable/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve cable history.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
