import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType') || searchParams.get('service') || '';
    const status = searchParams.get('status') || '';
    const channel = searchParams.get('channel') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const params = new URLSearchParams();
    if (serviceType && serviceType !== 'ALL') params.set('serviceType', serviceType);
    if (status && status !== 'ALL') params.set('status', status);
    if (channel && channel !== 'ALL') params.set('channel', channel);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('limit', limit);
    params.set('offset', offset);

    const result = await proxyToBackendApi(
      `/transactions?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve transactions.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
