import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams?.id || '';
    const authHeader = request.headers.get('authorization') || '';

    const result = await proxyToBackendApi(
      `/beneficiaries/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove beneficiary.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

