'use client';

import { useState } from 'react';

export default function SentryTestPage() {
  const [serverResult, setServerResult] = useState<string>('');

  async function triggerServerError() {
    setServerResult('Llamando al server...');
    try {
      const res = await fetch('/sentry-test/api');
      const text = await res.text();
      const snippet = text.length > 400 ? `${text.slice(0, 400)}…` : text;
      setServerResult(
        `HTTP ${res.status} ${res.statusText}\n\n${snippet || '(body vacío)'}\n\n→ Si ves 500 aquí, el error sí se lanzó en el server. Revisa Sentry en ~10s.`
      );
    } catch (err) {
      setServerResult(`Network error: ${(err as Error).message}`);
    }
  }

  function triggerClientError() {
    throw new Error('sentry-test-client — disparado desde modofundraising/sentry-test');
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '600px' }}>
      <h1>Sentry Test — modofundraising</h1>
      <p>Proyecto Sentry: <a href="https://gnb-labs.sentry.io/projects/modofundraising/" target="_blank" rel="noreferrer">gnb-labs/modofundraising</a></p>

      <h2 style={{ marginTop: '2rem' }}>1. Error de cliente (browser)</h2>
      <p>Tira un error en el navegador. Debe aparecer en Sentry en ~10 segundos.</p>
      <button
        onClick={triggerClientError}
        style={{ padding: '0.5rem 1rem', background: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Tirar error de cliente
      </button>

      <h2 style={{ marginTop: '2rem' }}>2. Error de servidor (API route)</h2>
      <p>Llama a /sentry-test/api que tira un error en el server.</p>
      <button
        onClick={triggerServerError}
        style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Tirar error de server
      </button>
      {serverResult && (
        <pre style={{ marginTop: '1rem', padding: '1rem', background: '#f4f4f4', overflow: 'auto' }}>
          {serverResult}
        </pre>
      )}

      <p style={{ marginTop: '2rem', color: '#666', fontSize: '0.9em' }}>
        BORRAR esta página después de validar: <code>src/app/sentry-test/</code>
      </p>
    </div>
  );
}
