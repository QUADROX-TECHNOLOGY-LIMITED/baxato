import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET() {
  try {
    const result = await proxyToBackendApi('/services/airtime/networks', {
      method: 'GET',
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve airtime network directory.';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
