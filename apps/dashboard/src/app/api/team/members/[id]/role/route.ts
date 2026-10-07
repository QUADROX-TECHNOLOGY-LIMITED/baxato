import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizId = request.headers.get('x-business-id') || '';
    const body = await request.json();

    const result = await proxyToBackendApi(
      `/team/members/${params.id}/role`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizId ? { 'x-business-id': bizId } : {}),
        },
        body: JSON.stringify(body),
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update member role.';
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
