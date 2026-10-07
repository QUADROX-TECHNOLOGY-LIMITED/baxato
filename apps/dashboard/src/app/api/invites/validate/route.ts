import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    const result = await proxyToBackendApi(
      `/invites/validate?token=${encodeURIComponent(token)}`,
      { method: 'GET' },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to validate invitation.';
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
