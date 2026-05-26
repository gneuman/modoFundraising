import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const err = new Error('sentry-test-server — disparado desde /sentry-test/api');
  Sentry.captureException(err);
  await Sentry.flush(2000);
  return NextResponse.json({ error: err.message }, { status: 500 });
}
