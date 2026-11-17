import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizHeader = request.headers.get('x-business-id') || '';
    const businessId = encodeURIComponent(context.params.id);

    const result = await proxyToBackendApi(
      `/businesses/${businessId}`,
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
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve business settings.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizHeader = request.headers.get('x-business-id') || '';
    const businessId = encodeURIComponent(context.params.id);
    const body = await request.json().catch(() => ({}));

    const result = await proxyToBackendApi(
      `/businesses/${businessId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizHeader ? { 'x-business-id': bizHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update business settings.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

