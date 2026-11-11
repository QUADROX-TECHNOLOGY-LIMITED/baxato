import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const forwardParams = new URLSearchParams();

    const network = searchParams.get('network');
    const category = searchParams.get('category');
    const dataType = searchParams.get('dataType');

    if (network) forwardParams.set('network', network);
    if (category) forwardParams.set('category', category);
    if (dataType) forwardParams.set('dataType', dataType);

    const qs = forwardParams.toString();
    const path = qs ? `/services/data/plans?${qs}` : '/services/data/plans';

    const result = await proxyToBackendApi(path, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve data plans.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

