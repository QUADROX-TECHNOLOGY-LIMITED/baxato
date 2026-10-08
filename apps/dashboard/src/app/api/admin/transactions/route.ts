import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);

    const query = new URLSearchParams();
    searchParams.forEach((value, key) => {
      query.set(key, value);
    });

    const result = await proxyToBackendApi(`/admin/transactions?${query.toString()}`, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve transactions.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
