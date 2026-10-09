import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await proxyToBackendApi(
      '/auth/staff/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      request,
    );
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Staff login failed.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 },
    );
  }
}
