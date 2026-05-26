import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log('[sentry.server.config] dsn present?', Boolean(dsn), 'runtime:', process.env.NEXT_RUNTIME);

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    debug: process.env.NODE_ENV !== 'production',

    beforeSend(event) {
      if (event.user?.email) event.user.email = '[redacted]';
      return event;
    },
  });
  console.log('[sentry.server.config] Sentry.init called');
}
