import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const result = await proxyToBackendApi(`/admin/transactions/${params.id}`, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve transaction details.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
