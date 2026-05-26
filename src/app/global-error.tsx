"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="font-sans antialiased bg-white text-zinc-900">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3">Algo salió mal</h1>
            <p className="text-zinc-600 mb-6">
              Tuvimos un problema cargando esta página. Ya recibimos el reporte y lo estamos revisando.
            </p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 transition"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
