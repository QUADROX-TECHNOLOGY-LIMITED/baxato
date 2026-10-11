import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/audit-logs?${queryString}` : '/admin/audit-logs';

    const result = await proxyToBackendApi(endpoint, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve audit trail.';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
