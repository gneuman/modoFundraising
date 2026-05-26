import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const client = Sentry.getClient();
  const dsn = client?.getDsn();
  const dsnHost = dsn && typeof dsn === 'object' ? dsn.host : null;

  console.log('[sentry-test/api] Sentry client?', Boolean(client), 'dsn host:', dsnHost);

  if (!client) {
    return NextResponse.json(
      {
        error: 'Sentry NO está inicializado en este runtime. Revisa la consola del dev server.',
        hint: 'Probablemente: (a) instrumentation.ts no se cargó, (b) SENTRY_DSN no estaba en env al arrancar el server, o (c) Turbopack está saltando instrumentation.',
      },
      { status: 500 }
    );
  }

  const err = new Error('sentry-test-server — disparado desde /sentry-test/api');
  const eventId = Sentry.captureException(err);
  const flushed = await Sentry.flush(2000);

  return NextResponse.json(
    { error: err.message, eventId, flushed, dsnHost },
    { status: 500 }
  );
}
