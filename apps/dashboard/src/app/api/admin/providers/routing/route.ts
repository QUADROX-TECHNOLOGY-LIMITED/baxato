import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const body = await request.json().catch(() => ({}));

    const result = await proxyToBackendApi('/admin/providers/routing', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update provider routing.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
