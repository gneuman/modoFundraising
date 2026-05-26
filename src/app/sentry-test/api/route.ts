import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('sentry-test-server — disparado desde /sentry-test/api');
  return NextResponse.json({ ok: true });
}
