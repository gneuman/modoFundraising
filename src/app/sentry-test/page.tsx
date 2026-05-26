'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

type Result = {
  status: 'ok' | 'fail';
  message: string;
};

export default function SentryTestPage() {
  const [clientResult, setClientResult] = useState<Result | null>(null);
  const [serverResult, setServerResult] = useState<Result | null>(null);

  async function triggerClientError() {
    setClientResult({ status: 'ok', message: 'Capturando...' });
    try {
      const err = new Error('sentry-test-client — disparado desde modofundraising/sentry-test');
      const eventId = Sentry.captureException(err);
      const flushed = await Sentry.flush(2000);
      setClientResult({
        status: flushed && eventId ? 'ok' : 'fail',
        message: flushed && eventId
          ? `✅ Error enviado a Sentry.\n\nEvent ID: ${eventId}\n\nDashboard: https://gnb-labs.sentry.io/projects/modofundraising/?query=${eventId}`
          : `⚠️ Algo falló.\n\nEvent ID: ${eventId ?? '(ninguno)'}\nFlushed: ${flushed}\n\nPosibles causas:\n• NEXT_PUBLIC_SENTRY_DSN no se leyó en build\n• CSP bloquea ingest.us.sentry.io\n• Ad-blocker activo`,
      });
    } catch (caught) {
      setClientResult({ status: 'fail', message: `Excepción inesperada: ${(caught as Error).message}` });
    }
  }

  async function triggerServerError() {
    setServerResult({ status: 'ok', message: 'Llamando al server...' });
    try {
      const res = await fetch('/sentry-test/api');
      const text = await res.text();
      const snippet = text.length > 400 ? `${text.slice(0, 400)}…` : text;
      setServerResult({
        status: res.status === 500 ? 'ok' : 'fail',
        message: `HTTP ${res.status} ${res.statusText}\n\n${snippet || '(body vacío)'}\n\n→ Si ves 500, el error sí se lanzó en el server. Revisa Sentry en ~10s.`,
      });
    } catch (err) {
      setServerResult({ status: 'fail', message: `Network error: ${(err as Error).message}` });
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '700px' }}>
      <h1>Sentry Test — modofundraising</h1>
      <p>
        Proyecto Sentry:{' '}
        <a href="https://gnb-labs.sentry.io/projects/modofundraising/" target="_blank" rel="noreferrer">
          gnb-labs/modofundraising
        </a>
      </p>

      <h2 style={{ marginTop: '2rem' }}>1. Error de cliente (browser)</h2>
      <p>Captura un error desde el navegador y lo manda explícitamente a Sentry.</p>
      <button
        onClick={triggerClientError}
        style={{
          padding: '0.5rem 1rem',
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Tirar error de cliente
      </button>
      {clientResult && (
        <pre
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: clientResult.status === 'ok' ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${clientResult.status === 'ok' ? '#4caf50' : '#e74c3c'}`,
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {clientResult.message}
        </pre>
      )}

      <h2 style={{ marginTop: '2rem' }}>2. Error de servidor (API route)</h2>
      <p>Llama a /sentry-test/api que captura el error en el server y devuelve 500.</p>
      <button
        onClick={triggerServerError}
        style={{
          padding: '0.5rem 1rem',
          background: '#3498db',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Tirar error de server
      </button>
      {serverResult && (
        <pre
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: serverResult.status === 'ok' ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${serverResult.status === 'ok' ? '#4caf50' : '#e74c3c'}`,
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {serverResult.message}
        </pre>
      )}

      <p style={{ marginTop: '2rem', color: '#666', fontSize: '0.9em' }}>
        BORRAR esta página después de validar: <code>src/app/sentry-test/</code>
      </p>
    </div>
  );
}
