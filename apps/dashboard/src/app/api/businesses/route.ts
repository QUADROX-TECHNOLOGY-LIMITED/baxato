import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizHeader = request.headers.get('x-business-id') || '';

    const result = await proxyToBackendApi(
      '/businesses',
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizHeader ? { 'x-business-id': bizHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve businesses.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const body = await request.json().catch(() => ({}));

    const result = await proxyToBackendApi(
      '/businesses',
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create business.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
