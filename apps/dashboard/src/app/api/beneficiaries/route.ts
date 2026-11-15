import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const result = await proxyToBackendApi(
      '/beneficiaries',
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load beneficiaries.';
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
      '/beneficiaries',
      {
        method: 'POST',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save beneficiary.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}

