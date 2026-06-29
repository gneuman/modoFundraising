import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',

    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      if (event.user?.email) event.user.email = '[redacted]';
      const breadcrumbs = event.breadcrumbs ?? [];
      for (const b of breadcrumbs) {
        if (b.data && typeof b.data === 'object') {
          if ('correo' in b.data) (b.data as Record<string, unknown>).correo = '[redacted]';
          if ('email' in b.data) (b.data as Record<string, unknown>).email = '[redacted]';
        }
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
