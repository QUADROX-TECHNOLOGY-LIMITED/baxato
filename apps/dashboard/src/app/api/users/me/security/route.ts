import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';

    const result = await proxyToBackendApi('/users/me/security', {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      },
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve security telemetry.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
