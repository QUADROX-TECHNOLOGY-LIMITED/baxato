import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const result = await proxyToBackendApi(`/admin/staff/${params.id}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke staff access.';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
