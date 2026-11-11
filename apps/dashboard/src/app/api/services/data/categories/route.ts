import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network');
    const path = network
      ? `/services/data/categories?network=${encodeURIComponent(network)}`
      : '/services/data/categories';

    const result = await proxyToBackendApi(path, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve data categories.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

