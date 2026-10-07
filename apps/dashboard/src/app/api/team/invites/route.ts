import { NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/api-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizId = request.headers.get('x-business-id') || '';

    const result = await proxyToBackendApi(
      '/team/invites',
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizId ? { 'x-business-id': bizId } : {}),
        },
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve invitations.';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bizId = request.headers.get('x-business-id') || '';
    const body = await request.json();

    const result = await proxyToBackendApi(
      '/team/invites',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(bizId ? { 'x-business-id': bizId } : {}),
        },
        body: JSON.stringify(body),
      },
      request,
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invitation.';
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
