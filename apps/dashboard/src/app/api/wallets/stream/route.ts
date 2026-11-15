import { NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { url: baseUrl, error: configError } = getBackendApiUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BACKEND_URL_NOT_CONFIGURED', message: configError },
      },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const businessIdHeader = request.headers.get('x-business-id') || '';
  const targetUrl = `${baseUrl}/wallets/stream`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(businessIdHeader ? { 'x-business-id': businessIdHeader } : {}),
      },
      cache: 'no-store',
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const errorPayload = await upstream.json().catch(() => ({
        success: false,
        error: { message: 'Unable to open live wallet stream.' },
      }));
      return NextResponse.json(errorPayload, { status: upstream.status || 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const message = err instanceof Error ? err.message : 'Failed to connect wallet stream.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 },
    );
  }
}

