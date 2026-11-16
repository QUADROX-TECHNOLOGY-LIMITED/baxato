import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const businessId = request.headers.get('x-business-id') || '';
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const backendPath = qs ? `/audit-logs/business?${qs}` : '/audit-logs/business';

    const result = await proxyToBackendApi(
      backendPath,
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve workspace audit logs.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

