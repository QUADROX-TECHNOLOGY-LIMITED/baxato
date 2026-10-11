import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizHeader = request.headers.get('x-business-id') || '';
    const { searchParams } = new URL(request.url);

    const params = new URLSearchParams();
    for (const [key, val] of searchParams.entries()) {
      params.set(key, val);
    }

    const result = await proxyToBackendApi(
      `/analytics/overview?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizHeader ? { 'x-business-id': bizHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve analytics data.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
