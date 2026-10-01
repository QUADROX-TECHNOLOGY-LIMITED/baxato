import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const { reference } = await params;
    const authHeader = request.headers.get('authorization') || '';

    const result = await proxyToBackendApi(`/services/electricity/status/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Status query failed.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
