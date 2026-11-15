import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const result = await proxyToBackendApi(
      '/services/data/networks',
      { method: 'GET' },
      request,
    );
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch data networks.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

