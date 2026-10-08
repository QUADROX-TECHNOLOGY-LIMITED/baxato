import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const keyId = params.id;
    const authHeader = request.headers.get('authorization') || '';
    const bizId = request.headers.get('x-business-id') || '';

    const result = await proxyToBackendApi(
      `/developer/keys/${keyId}`,
      {
        method: 'DELETE',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizId ? { 'x-business-id': bizId } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete API key.';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
