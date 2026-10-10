import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const businessId = params.id;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: { message: 'Business ID is required.' } },
        { status: 400 },
      );
    }

    const result = await proxyToBackendApi(
      `/businesses/${businessId}/switch`,
      {
        method: 'POST',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to switch business workspace.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
