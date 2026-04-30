import { CopyButton } from "./copy-button";
import { ApiKeyDisplay } from "./api-key-display";

export const dynamic = "force-dynamic";

const BASE = "https://modofundraising.vercel.app";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "PUT";
  path: string;
  description: string;
  body?: object;
  note?: string;
}

const ENDPOINTS: { section: string; items: Endpoint[] }[] = [
  {
    section: "Postulaciones",
    items: [
      {
        method: "GET",
        path: "/api/admin/applications",
        description: "Listar todas las postulaciones con datos de founder y startup",
      },
      {
        method: "PATCH",
        path: "/api/admin/applications",
        description: "Cambiar status · Admitida envía email de admisión, Rechazada envía email de rechazo",
        body: { recordId: "recXXXXXXXXXXXXXX", status: "Admitida" },
        note: "Status válidos: Nueva postulación · En revisión · Admitida · Rechazada · Inscrita · Churn · Churn By Founder",
      },
      {
        method: "PATCH",
        path: "/api/admin/applications",
        description: "Rechazar con motivo",
        body: { recordId: "recXXXXXXXXXXXXXX", status: "Rechazada", rejection_reason: "MRR insuficiente" },
      },
      {
        method: "PATCH",
        path: "/api/admin/applications",
        description: "Asignar cupón a postulación",
        body: { recordId: "recXXXXXXXXXXXXXX", coupon_code: "ALUMNI15", discount_percent: 15, stripe_coupon_id: "coup_XXXX" },
      },
      {
        method: "PATCH",
        path: "/api/admin/applications",
        description: "Reenviar link de checkout",
        body: { recordId: "recXXXXXXXXXXXXXX", action: "resend_checkout" },
      },
    ],
  },
  {
    section: "Emails",
    items: [
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Email de admisión con link de pago",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "admision" },
        note: "Si tiene discount_percent > 0 manda email de cupón automáticamente",
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Email de cupón / descuento",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "cupon" },
        note: "La postulación debe tener discount_percent asignado",
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Email de rechazo",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "rechazo" },
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Follow-up 1 — primer recordatorio de pago pendiente",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "follow_up_1" },
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Follow-up 2 — segundo recordatorio",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "follow_up_2" },
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Bienvenida al portal (onboarding)",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "onboarding" },
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Confirmación de pago — cuota específica",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "pago_confirmado", installment: 1 },
        note: "installment: 1, 2 o 3",
      },
      {
        method: "POST",
        path: "/api/admin/send-email",
        description: "Email de cancelación (churn)",
        body: { recordId: "recXXXXXXXXXXXXXX", type: "churn" },
      },
    ],
  },
  {
    section: "Cupones",
    items: [
      {
        method: "GET",
        path: "/api/admin/coupons",
        description: "Listar todos los cupones",
      },
      {
        method: "POST",
        path: "/api/admin/coupons",
        description: "Crear cupón en Stripe + Airtable",
        body: { name: "Alumni 15%", percentOff: 15, code: "ALUMNI15", description: "Descuento para alumni" },
        note: "percentOff válidos: 10 · 15 · 20 · 25 · 50 · 100",
      },
      {
        method: "PUT",
        path: "/api/admin/coupons",
        description: "Enviar checkout con cupón a email específico",
        body: { email: "founder@startup.com", firstName: "María", couponId: "coup_XXXX", percentOff: 15 },
      },
    ],
  },
  {
    section: "Clases",
    items: [
      {
        method: "GET",
        path: "/api/admin/clases",
        description: "Listar clases con misiones y recursos incluidos",
      },
      {
        method: "POST",
        path: "/api/admin/clases",
        description: "Crear clase",
        body: { titulo: "Clase 1 — Narrativa para inversores", semana: 1, fecha: "2026-06-02", url_live: "https://meet.google.com/xxx", status: "Próxima" },
        note: "status válidos: Próxima · En vivo · Grabada",
      },
      {
        method: "PATCH",
        path: "/api/admin/clases",
        description: "Actualizar clase (agregar grabación, cambiar status, etc.)",
        body: { id: "recXXXXXXXXXXXXXX", url_grabacion: "https://loom.com/share/xxx", status: "Grabada" },
      },
    ],
  },
  {
    section: "Misiones",
    items: [
      {
        method: "POST",
        path: "/api/admin/misiones",
        description: "Crear misión",
        body: { titulo: "Misión 1 — Executive Summary", semana: 1, fecha_limite: "2026-06-05", claseId: "recXXXXXXXXXXXXXX", status: "Próxima" },
        note: "status válidos: Próxima · Activa · Cerrada",
      },
      {
        method: "PATCH",
        path: "/api/admin/misiones",
        description: "Actualizar misión",
        body: { id: "recXXXXXXXXXXXXXX", status: "Activa", fecha_limite: "2026-06-07" },
      },
    ],
  },
  {
    section: "Recursos",
    items: [
      {
        method: "POST",
        path: "/api/admin/recursos",
        description: "Crear recurso",
        body: { titulo: "Template Executive Summary", url: "https://docs.google.com/...", tipo: "Template", claseId: "recXXXXXXXXXXXXXX" },
      },
      {
        method: "PATCH",
        path: "/api/admin/recursos",
        description: "Actualizar recurso",
        body: { id: "recXXXXXXXXXXXXXX", url: "https://docs.google.com/..." },
      },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:   "bg-green-100 text-green-700",
  POST:  "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  PUT:   "bg-purple-100 text-purple-700",
};

function buildCurl(ep: Endpoint, apiKey: string): string {
  const method = ep.method !== "GET" ? `-X ${ep.method} ` : "";
  const bodyArg = ep.body
    ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(ep.body, null, 2)}'`
    : "";
  return `curl ${method}${BASE}${ep.path} \\\n  -H "Authorization: Bearer ${apiKey}"${bodyArg}`;
}

export default function ApiDocsPage() {
  const apiKey = process.env.EMAIL_API_SECRET ?? "mf2026_sk_live_...";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">API Reference</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Todos los endpoints admin. Usá el Bearer token desde n8n, Make o cualquier herramienta externa.
        </p>
      </div>

      {/* API Key */}
      <ApiKeyDisplay apiKey={apiKey} />

      {/* Endpoints por sección */}
      {ENDPOINTS.map((group) => (
        <div key={group.section} className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2">
            {group.section}
          </h2>

          <div className="space-y-3">
            {group.items.map((ep, i) => {
              const curl = buildCurl(ep, apiKey);
              return (
                <div key={i} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  {/* Info row */}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0 mt-0.5 ${METHOD_COLOR[ep.method]}`}>
                      {ep.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <code className="text-sm text-zinc-700 font-mono">{ep.path}</code>
                      <p className="text-sm text-zinc-500 mt-0.5">{ep.description}</p>
                      {ep.note && (
                        <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-block">
                          {ep.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* cURL block */}
                  <div className="border-t border-zinc-100 bg-zinc-950 relative group">
                    <pre className="text-xs text-zinc-300 font-mono p-4 overflow-x-auto whitespace-pre leading-relaxed">
                      {curl}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={curl} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
