"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  X, ExternalLink, CheckCircle, XCircle, Send, Loader2,
  Building2, Globe, Phone, Mail, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ApplicationRecord, ApplicationStatus, CouponRecord } from "@/lib/airtable";

interface Props {
  app: ApplicationRecord;
  coupons: CouponRecord[];
  onClose: () => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onCouponAssign: (id: string, coupon: CouponRecord) => void;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-700">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "Nueva postulación": "bg-zinc-100 text-zinc-600",
  "Admitida": "bg-blue-100 text-blue-700",
  "Rechazada": "bg-red-100 text-red-700",
  "Sin Respuesta": "bg-zinc-100 text-zinc-500",
  "Inscrita": "bg-green-100 text-green-700",
  "Invitada institucional": "bg-purple-100 text-purple-700",
  "Churn": "bg-red-100 text-red-600",
};

export function ApplicationProfile({ app, coupons, onClose, onStatusChange, onCouponAssign }: Props) {
  const [admitting, setAdmitting] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(app.coupon_code as string ?? "");
  const [assigningCoupon, setAssigningCoupon] = useState(false);

  async function handleAdmit() {
    setAdmitting(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: app.id,
          status: "Admitida",
          appData: {
            email: app.email,
            firstName: app.first_name,
            startupName: app.startup_name,
            stripeCouponId: app.stripe_coupon_id,
            discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error();
      onStatusChange(app.id!, "Admitida");
      toast.success(`✅ ${app.startup_name} admitida — email con link de pago enviado`);
      onClose();
    } catch {
      toast.error("Error al admitir");
    } finally {
      setAdmitting(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: app.id,
          status: "Rechazada",
          rejection_reason: rejectReason || undefined,
          appData: { email: app.email, firstName: app.first_name, startupName: app.startup_name },
        }),
      });
      if (!res.ok) throw new Error();
      onStatusChange(app.id!, "Rechazada");
      toast.success(`${app.startup_name} rechazada`);
      onClose();
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setRejecting(false);
    }
  }

  async function handleSendLink() {
    setSendingLink(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: app.id,
          action: "resend_checkout",
          appData: {
            email: app.email,
            firstName: app.first_name,
            startupName: app.startup_name,
            stripeCouponId: app.stripe_coupon_id,
            discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast.success("Email con link de pago enviado");
    } catch (err) {
      toast.error(`Error al enviar link: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function handleCouponAssign() {
    const removing = !selectedCoupon;
    const coupon = coupons.find((c) => c.code === selectedCoupon);
    if (!removing && !coupon) return;
    setAssigningCoupon(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: app.id,
          coupon_code: coupon?.code ?? "",
          discount_percent: coupon?.discount_percent ?? 0,
          stripe_coupon_id: coupon?.stripe_coupon_id ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      onCouponAssign(app.id!, coupon ?? { id: "", code: "", discount_percent: 0, stripe_coupon_id: "", active: true });
      toast.success(removing ? "Cupón eliminado" : `Cupón ${coupon!.code} (${coupon!.discount_percent}% off) asignado`);
    } catch {
      toast.error(removing ? "Error al eliminar cupón" : "Error al asignar cupón");
    } finally {
      setAssigningCoupon(false);
    }
  }

  const canAdmit = app.status === "Nueva postulación" || app.status === "Sin Respuesta" || app.status === "En revisión";
  const canSendLink = app.status === "Admitida";

  const followUpNum = app.follow_up_2_sent ? 2 : app.follow_up_1_sent ? 1 : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-800 truncate">{app.startup_name}</h2>
              {app.ias_interested === "Sí" && (
                <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  <Building2 className="h-3 w-3" /> Inv. Institucional
                </span>
              )}
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[app.status ?? ""] ?? "bg-zinc-100 text-zinc-600")}>
                {app.status}
              </span>
              {followUpNum > 0 && (
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold",
                  followUpNum === 2 ? "bg-red-500 text-white" : "bg-amber-400 text-white"
                )} title={`Seguimiento ${followUpNum}/2 enviado`}>
                  {followUpNum}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">{app.first_name} {app.last_name} · {app.email}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Coupon */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
          <Tag className="h-4 w-4 text-purple-500 shrink-0" />
          <select
            value={selectedCoupon}
            onChange={(e) => setSelectedCoupon(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">Sin cupón</option>
            {coupons.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.code}>{c.code} — {c.discount_percent}% off</option>
            ))}
          </select>
          <Button
            onClick={handleCouponAssign}
            disabled={selectedCoupon === (app.coupon_code as string ?? "") || assigningCoupon}
            className={selectedCoupon ? "bg-purple-600 hover:bg-purple-700 text-white h-8 text-sm px-3 shrink-0" : "bg-zinc-200 hover:bg-zinc-300 text-zinc-700 h-8 text-sm px-3 shrink-0"}
          >
            {assigningCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedCoupon ? "Asignar" : "Quitar"}
          </Button>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 bg-white border-b border-zinc-100 flex gap-2 flex-wrap">
          {canAdmit && (
            <>
              <Button
                onClick={handleAdmit}
                disabled={admitting}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 text-sm"
              >
                {admitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Admitir y enviar link
              </Button>
              {!showRejectReason && (
                <Button
                  variant="outline"
                  onClick={() => setShowRejectReason(true)}
                  className="gap-1.5 h-9 text-sm text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
              )}
            </>
          )}
          {canSendLink && (
            <Button
              onClick={handleSendLink}
              disabled={sendingLink}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 text-sm"
            >
              {sendingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Reenviar link de pago
            </Button>
          )}
          {app.deck_url && (
            <a
              href={app.deck_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Ver deck
            </a>
          )}
        </div>

        {/* Reject reason input */}
        {showRejectReason && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razón de rechazo (opcional)..."
              rows={2}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={rejecting}
                className="bg-red-600 hover:bg-red-700 text-white h-8 text-sm gap-1.5"
              >
                {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Confirmar rechazo
              </Button>
              <Button variant="outline" onClick={() => setShowRejectReason(false)} className="h-8 text-sm">Cancelar</Button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 space-y-6 flex-1">

          {/* Founder */}
          <Section title="Founder">
            <Field label="Nombre" value={`${app.first_name} ${app.last_name}`} />
            <Field label="Rol" value={app.founder_role} />
            <div className="col-span-2 flex flex-wrap gap-3 text-sm">
              {app.email && (
                <a href={`mailto:${app.email}`} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800">
                  <Mail className="h-3.5 w-3.5" />{app.email}
                </a>
              )}
              {app.whatsapp && (
                <a href={`https://wa.me/${app.whatsapp?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800">
                  <Phone className="h-3.5 w-3.5" />{app.whatsapp}
                </a>
              )}
              {app.linkedin_founder && (
                <a href={app.linkedin_founder as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800">
                  <ExternalLink className="h-3.5 w-3.5" />LinkedIn
                </a>
              )}
            </div>
            <Field label="País de residencia" value={app.country_residence} />
          </Section>

          {/* Startup */}
          <Section title="Startup">
            <Field label="País de operación" value={app.startup_country_ops} />
            <Field label="Etapa" value={app.startup_stage} />
            <Field label="Equipo" value={app.startup_team_size ? `${app.startup_team_size} personas` : undefined} />
            <Field label="Modelo de negocio" value={app.business_model} />
            {app.startup_description && (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Descripción</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{app.startup_description}</p>
              </div>
            )}
            <Field label="Industrias" value={app.startup_industries} />
            <Field label="Expansión" value={app.startup_countries_expansion} />
            <Field label="USA / Internacional" value={app.startup_usa_intl} />
            <div className="col-span-2 flex flex-wrap gap-3 text-sm">
              {app.startup_website && (
                <a href={app.startup_website as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800">
                  <Globe className="h-3.5 w-3.5" />Website
                </a>
              )}
              {app.startup_linkedin && (
                <a href={app.startup_linkedin as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800">
                  <ExternalLink className="h-3.5 w-3.5" />LinkedIn startup
                </a>
              )}
            </div>
          </Section>

          {/* Financials */}
          <Section title="Finanzas">
            <Field label="MRR" value={app.startup_mrr ? `$${Number(app.startup_mrr).toLocaleString()}/mo` : undefined} />
            <Field label="Ventas 12m" value={app.startup_sales_12m ? `$${Number(app.startup_sales_12m).toLocaleString()}` : undefined} />
            <Field label="Runway" value={app.runway ? `${app.runway} meses` : undefined} />
            <Field label="Fundraising previo" value={app.prior_fundraising} />
            {(app.prior_fundraising_amount ?? 0) > 0 && (
              <Field label="Monto previo" value={`$${Number(app.prior_fundraising_amount).toLocaleString()}`} />
            )}
          </Section>

          {/* Round */}
          {(app.round_open || app.round_series || (app.round_size ?? 0) > 0) && (
            <Section title="Ronda actual">
              <Field label="Ronda abierta" value={app.round_open} />
              <Field label="Serie" value={app.round_series} />
              <Field label="Tamaño" value={app.round_size ? `$${Number(app.round_size).toLocaleString()}` : undefined} />
              <Field label="Tickets" value={app.round_tickets} />
            </Section>
          )}

          {/* Application meta */}
          <Section title="Postulación">
            <Field label="Fuente" value={app.program_source} />
            <Field label="Fecha" value={app.created_at ? new Date(app.created_at as string).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
            {app.coupon_code && (
              <div className="col-span-2 flex items-center gap-1.5 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
                <Tag className="h-3.5 w-3.5" />
                <span>Cupón: <strong>{app.coupon_code as string}</strong> — {app.discount_percent as number}% off</span>
              </div>
            )}
          </Section>

          {/* Referrals */}
          {(app.referral_1_name || app.referral_2_name || app.referral_3_name) && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1">Referencias</p>
              {[
                { name: app.referral_1_name, last: app.referral_1_lastname, email: app.referral_1_email, linkedin: app.referral_1_linkedin, relation: app.referral_1_relation },
                { name: app.referral_2_name, last: app.referral_2_lastname, email: app.referral_2_email, linkedin: app.referral_2_linkedin, relation: app.referral_2_relation },
                { name: app.referral_3_name, last: app.referral_3_lastname, email: app.referral_3_email, linkedin: app.referral_3_linkedin, relation: app.referral_3_relation },
              ].filter((r) => r.name).map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-2 bg-zinc-50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-zinc-700">{r.name} {r.last}</p>
                    <p className="text-xs text-zinc-400">{r.relation} · {r.email}</p>
                  </div>
                  {r.linkedin && (
                    <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
