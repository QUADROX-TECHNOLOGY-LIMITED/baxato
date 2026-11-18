import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const id = params?.id || '';

    const result = await proxyToBackendApi(
      `/transactions/${encodeURIComponent(id)}/check-status`,
      {
        method: 'POST',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to check transaction status.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
