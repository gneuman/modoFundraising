"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  ExternalLink, CheckCircle, XCircle, X, Loader2,
  AlertTriangle, Clock, CreditCard, Tag, MoreHorizontal, Link2, BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApplicationRecord, ApplicationStatus, CouponRecord } from "@/lib/airtable";

// ─── Pipeline columns ─────────────────────────────────────────────────────────

const COLUMNS: { id: ApplicationStatus; label: string; border: string; header: string }[] = [
  { id: "Nueva postulación", label: "Nueva postulación", border: "border-t-zinc-400",  header: "bg-zinc-100 text-zinc-700" },
  { id: "Admitida",          label: "Admitida",           border: "border-t-blue-500",  header: "bg-blue-50 text-blue-700" },
  { id: "Inscrita",          label: "Inscrita",           border: "border-t-green-500", header: "bg-green-50 text-green-700" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOld(dateStr?: string) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr as string).getTime()) / 86_400_000);
}

function dotClass(days: number) {
  if (days <= 2) return "bg-green-500";
  if (days <= 6) return "bg-yellow-400";
  return "bg-red-500";
}

interface Alert { icon: React.ReactNode; text: string; cls: string }

function getAlerts(a: ApplicationRecord, days: number): Alert[] {
  const out: Alert[] = [];
  if (a.status === "Admitida" && days > 3)
    out.push({ icon: <CreditCard className="h-3 w-3" />, text: `Sin pago · ${days}d`, cls: days > 7 ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200" });
  if (a.status === "Inscrita" && a.payment_status === "Cuota 1 pagada")
    out.push({ icon: <Clock className="h-3 w-3" />, text: "Cuota 2 pendiente", cls: "bg-blue-50 text-blue-600 border-blue-200" });
  if (a.status === "Inscrita" && a.payment_status === "Cuota 2 pagada")
    out.push({ icon: <Clock className="h-3 w-3" />, text: "Cuota 3 pendiente", cls: "bg-purple-50 text-purple-600 border-purple-200" });
  if (days > 7 && (a.status === "Nueva postulación" || a.status === "En revisión"))
    out.push({ icon: <AlertTriangle className="h-3 w-3" />, text: `Sin mover · ${days}d`, cls: "bg-orange-50 text-orange-600 border-orange-200" });
  return out;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface StatusModal {
  type: "Admitida" | "Rechazada" | "Rechazada por founder";
  recordId: string;
  startupName: string;
  founderName: string;
  reason: string;
}

interface ActionsModal {
  app: ApplicationRecord;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function KanbanCard({
  a, onAdmit, onReject, onSinRespuesta, onActions, updating, onDragStart,
}: {
  a: ApplicationRecord;
  onAdmit: (a: ApplicationRecord) => void;
  onReject: (a: ApplicationRecord) => void;
  onSinRespuesta: (a: ApplicationRecord) => void;
  onRechazadoFounder: (a: ApplicationRecord) => void;
  onActions: (a: ApplicationRecord) => void;
  updating: string | null;
  onDragStart: (id: string) => void;
}) {
  const days = daysOld(a.created_at as string);
  const alerts = getAlerts(a, days);
  const canAct = a.status === "Nueva postulación";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(a.id!)}
      className="bg-white rounded-xl border border-zinc-200 p-3.5 space-y-2.5 hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 select-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-800 text-sm truncate">{a.startup_name}</p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{a.first_name} {a.last_name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onActions(a); }}
            className="p-1 rounded-md hover:bg-zinc-100 text-zinc-300 hover:text-zinc-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Acciones"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <span className={cn("w-2.5 h-2.5 rounded-full mt-0.5", dotClass(days))} title={`${days} días`} />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-500">
        {a.startup_country_ops && <span>{a.startup_country_ops}</span>}
        {a.startup_stage && <><span className="text-zinc-200">·</span><span>{a.startup_stage}</span></>}
        {a.startup_mrr ? <><span className="text-zinc-200">·</span><span className="font-mono font-semibold text-zinc-700">${Number(a.startup_mrr).toLocaleString()}/mo</span></> : null}
        {a.round_size ? <><span className="text-zinc-200">·</span><span className="font-mono text-emerald-700 font-semibold">Ronda ${Number(a.round_size).toLocaleString()}</span></> : null}
      </div>

      {/* Referral code */}
      {a.referral_code && (
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
          <Link2 className="h-3 w-3" />
          <span>Ref: {a.referral_code as string}</span>
        </div>
      )}

      {/* Alerts */}
      {alerts.map((al, i) => (
        <div key={i} className={cn("flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border", al.cls)}>
          {al.icon}<span>{al.text}</span>
        </div>
      ))}

      {/* Coupon badge */}
      {a.coupon_code && (
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border bg-purple-50 text-purple-700 border-purple-200">
          <Tag className="h-3 w-3" />
          <span>{a.coupon_code as string} · {a.discount_percent as number}% off</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          {a.deck_url && (
            <a href={a.deck_url as string} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700"
              onMouseDown={(e) => e.stopPropagation()}>
              Deck <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          <span className="text-xs text-zinc-300">{days}d</span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canAct && (
            <>
              <button onClick={() => onAdmit(a)} disabled={updating === a.id} title="Admitir"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-zinc-300 hover:text-blue-600 transition-colors">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button onClick={() => onReject(a)} disabled={updating === a.id} title="Rechazar"
                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {a.status === "Admitida" && (
            <>
              <button onClick={() => onSinRespuesta(a)} disabled={updating === a.id} title="Sin respuesta"
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-300 hover:text-zinc-500 transition-colors">
                <BellOff className="h-4 w-4" />
              </button>
              <button onClick={() => onRechazadoFounder(a)} disabled={updating === a.id} title="Rechazado por founder"
                className="p-1.5 rounded-lg hover:bg-orange-50 text-zinc-300 hover:text-orange-500 transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drop Column ──────────────────────────────────────────────────────────────

function DropColumn({
  col, cards, onAdmit, onReject, onSinRespuesta, onActions, updating, onDragStart, onDrop, dragOver, setDragOver,
}: {
  col: typeof COLUMNS[0];
  cards: ApplicationRecord[];
  onAdmit: (a: ApplicationRecord) => void;
  onReject: (a: ApplicationRecord) => void;
  onSinRespuesta: (a: ApplicationRecord) => void;
  onRechazadoFounder: (a: ApplicationRecord) => void;
  onActions: (a: ApplicationRecord) => void;
  updating: string | null;
  onDragStart: (id: string) => void;
  onDrop: (targetStatus: ApplicationStatus) => void;
  dragOver: string | null;
  setDragOver: (id: string | null) => void;
}) {
  const isOver = dragOver === col.id;

  return (
    <div
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-xl border border-zinc-200 border-t-[3px] overflow-hidden transition-all",
        col.border,
        isOver && "ring-2 ring-blue-400 ring-offset-1"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
      onDragLeave={() => setDragOver(null)}
      onDrop={() => { setDragOver(null); onDrop(col.id); }}
    >
      <div className={cn("flex items-center justify-between px-3 py-2.5", col.header)}>
        <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
        <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded-full">{cards.length}</span>
      </div>

      <div className={cn(
        "flex flex-col gap-2 p-2 min-h-[120px] transition-colors",
        isOver ? "bg-blue-50/60" : "bg-zinc-50/60"
      )}>
        {cards.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-16 text-xs text-zinc-300">Sin postulaciones</div>
        )}
        {isOver && cards.length === 0 && (
          <div className="flex items-center justify-center h-16 border-2 border-dashed border-blue-300 rounded-xl text-xs text-blue-400">
            Soltar aquí
          </div>
        )}
        {cards.map((a) => (
          <KanbanCard key={a.id} a={a} onAdmit={onAdmit} onReject={onReject} onSinRespuesta={onSinRespuesta} onRechazadoFounder={onRechazadoFounder} onActions={onActions} updating={updating} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}

// ─── Reject Drop Zone ─────────────────────────────────────────────────────────

function RejectZone({ dragging, dragOver, setDragOver, onDrop }: {
  dragging: boolean; dragOver: string | null;
  setDragOver: (id: string | null) => void; onDrop: () => void;
}) {
  const isOver = dragOver === "Rechazada";
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl border-2 border-dashed py-4 px-6 transition-all mt-1",
        dragging
          ? isOver ? "border-red-400 bg-red-50" : "border-red-300 bg-red-50/40 opacity-100"
          : "border-zinc-200 bg-zinc-50/40 opacity-40"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver("Rechazada"); }}
      onDragLeave={() => setDragOver(null)}
      onDrop={() => { setDragOver(null); onDrop(); }}
    >
      <XCircle className={cn("h-5 w-5", isOver ? "text-red-500" : "text-red-300")} />
      <span className={cn("text-sm font-semibold", isOver ? "text-red-600" : "text-red-400")}>
        {isOver ? "Soltar para rechazar" : "Arrastrar aquí para rechazar"}
      </span>
    </div>
  );
}

// ─── Actions Modal ────────────────────────────────────────────────────────────

function ActionsModalView({ app, coupons, onClose, onCouponAssign, onAdmit, onReject, updating }: {
  app: ApplicationRecord;
  coupons: CouponRecord[];
  onClose: () => void;
  onCouponAssign: (app: ApplicationRecord, coupon: CouponRecord) => void;
  onAdmit: (a: ApplicationRecord) => void;
  onReject: (a: ApplicationRecord) => void;
  updating: string | null;
}) {
  const [selectedCoupon, setSelectedCoupon] = useState(app.coupon_code as string ?? "");
  const [copyingLink, setCopyingLink] = useState(false);
  const canAct = app.status === "Nueva postulación" || app.status === "En revisión";

  async function handleCopyCheckoutLink() {
    setCopyingLink(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: app.id, action: "resend_checkout" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      await navigator.clipboard.writeText(data.url);
      toast.success("Link de pago copiado al portapapeles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar link");
    } finally {
      setCopyingLink(false);
    }
  }

  function handleCouponSave() {
    const coupon = coupons.find((c) => c.code === selectedCoupon);
    if (coupon) onCouponAssign(app, coupon);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100">
          <div>
            <p className="font-bold text-zinc-800">{app.startup_name}</p>
            <p className="text-sm text-zinc-400 mt-0.5">{app.first_name} {app.last_name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Coupon */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cupón de descuento</p>
            <div className="flex gap-2">
              <select
                value={selectedCoupon}
                onChange={(e) => setSelectedCoupon(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Sin cupón</option>
                {coupons.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.discount_percent}% off
                  </option>
                ))}
              </select>
              <Button
                onClick={handleCouponSave}
                disabled={!selectedCoupon || updating === app.id}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4"
              >
                {updating === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar"}
              </Button>
            </div>
            {app.coupon_code && (
              <p className="text-xs text-purple-600">
                Actual: <span className="font-semibold">{app.coupon_code as string}</span> ({app.discount_percent as number}% off)
              </p>
            )}
          </div>

          {/* Status actions */}
          {canAct && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cambiar estado</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onAdmit(app); onClose(); }}
                  disabled={!!updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <CheckCircle className="h-4 w-4" /> Admitir
                </button>
                <button
                  onClick={() => { onReject(app); onClose(); }}
                  disabled={!!updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                >
                  <XCircle className="h-4 w-4" /> Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Links rápidos</p>
            <div className="flex flex-col gap-1.5">
              {app.deck_url && (
                <a href={app.deck_url as string} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 py-1">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver pitch deck
                </a>
              )}
              <button
                onClick={handleCopyCheckoutLink}
                disabled={copyingLink}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800 py-1 disabled:opacity-50"
              >
                {copyingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                {copyingLink ? "Generando..." : "Copiar link de pago"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function KanbanPostulaciones({ initialData, coupons }: {
  initialData: ApplicationRecord[];
  coupons: CouponRecord[];
}) {
  const [data, setData] = useState(initialData);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModal | null>(null);
  const [actionsModal, setActionsModal] = useState<ActionsModal | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingId = useRef<string | null>(null);

  const byColumn = useMemo(() => {
    const map: Record<string, ApplicationRecord[]> = {};
    COLUMNS.forEach((c) => { map[c.id] = data.filter((a) => a.status === c.id); });
    return map;
  }, [data]);

  function onDragStart(id: string) {
    draggingId.current = id;
    setIsDragging(true);
  }

  async function moveCard(targetStatus: ApplicationStatus | "Rechazada") {
    const id = draggingId.current;
    draggingId.current = null;
    if (!id) return;
    const card = data.find((a) => a.id === id);
    if (!card || card.status === targetStatus) return;
    if (targetStatus === "Admitida" || targetStatus === "Rechazada") {
      setStatusModal({ type: targetStatus, recordId: id, startupName: card.startup_name ?? "", founderName: `${card.first_name ?? ""} ${card.last_name ?? ""}`.trim(), reason: "" });
      return;
    }
    await applyStatus(id, targetStatus);
  }

  function openAdmit(a: ApplicationRecord) {
    setStatusModal({ type: "Admitida", recordId: a.id!, startupName: a.startup_name ?? "", founderName: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(), reason: "" });
  }
  function openReject(a: ApplicationRecord) {
    setStatusModal({ type: "Rechazada", recordId: a.id!, startupName: a.startup_name ?? "", founderName: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(), reason: "" });
  }
  async function marcarSinRespuesta(a: ApplicationRecord) {
    await applyStatus(a.id!, "Sin Respuesta");
  }
  function openRechazadoFounder(a: ApplicationRecord) {
    setStatusModal({ type: "Rechazada por founder", recordId: a.id!, startupName: a.startup_name ?? "", founderName: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(), reason: "" });
  }

  async function applyStatus(recordId: string, status: ApplicationStatus, reason?: string) {
    setUpdating(recordId);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, status, ...(reason ? { rejection_reason: reason } : {}) }),
      });
      if (!res.ok) throw new Error();
      setData((prev) => prev.map((a) => a.id === recordId ? { ...a, status } : a));
      toast.success(
        status === "Admitida" ? "✅ Admitida — email con link de pago enviado"
        : status === "Rechazada" ? "Postulación rechazada"
        : `Movida a ${status}`
      );
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdating(null);
    }
  }

  async function assignCoupon(app: ApplicationRecord, coupon: CouponRecord) {
    setUpdating(app.id!);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: app.id, coupon_code: coupon.code, discount_percent: coupon.discount_percent, stripe_coupon_id: coupon.stripe_coupon_id }),
      });
      if (!res.ok) throw new Error();
      setData((prev) => prev.map((a) => a.id === app.id ? { ...a, coupon_code: coupon.code, discount_percent: coupon.discount_percent } : a));
      setActionsModal((m) => m ? { ...m, app: { ...m.app, coupon_code: coupon.code, discount_percent: coupon.discount_percent } } : m);
      toast.success(`Cupón ${coupon.code} (${coupon.discount_percent}% off) asignado`);
    } catch {
      toast.error("Error al asignar cupón");
    } finally {
      setUpdating(null);
    }
  }

  const hiddenCount = data.filter((a) => a.status === "Rechazada" || a.status === "Churn").length;

  return (
    <div className="space-y-3" onDragEnd={() => { draggingId.current = null; setDragOver(null); setIsDragging(false); }}>

      <div className="flex gap-3 overflow-x-auto pb-2 items-start">
        {COLUMNS.map((col) => (
          <DropColumn
            key={col.id}
            col={col}
            cards={byColumn[col.id] ?? []}
            onAdmit={openAdmit}
            onReject={openReject}
            onSinRespuesta={marcarSinRespuesta}
            onRechazadoFounder={openRechazadoFounder}
            onActions={(a) => setActionsModal({ app: a })}
            updating={updating}
            onDragStart={onDragStart}
            onDrop={(status) => moveCard(status)}
            dragOver={dragOver}
            setDragOver={setDragOver}
          />
        ))}
      </div>

      <RejectZone dragging={isDragging} dragOver={dragOver} setDragOver={setDragOver} onDrop={() => moveCard("Rechazada")} />

      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &lt;3 días</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 3–6 días</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> +7 días</span>
        </div>
        {hiddenCount > 0 && <span>{hiddenCount} rechazada{hiddenCount > 1 ? "s" : ""}/churn · ver en vista Tabla</span>}
      </div>

      {/* Status modal (Admitir / Rechazar) */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-800">
                  {statusModal.type === "Admitida" ? "✅ Admitir postulación" : statusModal.type === "Rechazada por founder" ? "Rechazado por founder" : "Rechazar postulación"}
                </h3>
                <p className="text-sm text-zinc-500 mt-0.5">{statusModal.startupName} — {statusModal.founderName}</p>
              </div>
              <button onClick={() => setStatusModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                {statusModal.type === "Admitida"
                  ? "Nota de admisión (opcional)"
                  : statusModal.type === "Rechazada por founder"
                  ? "¿Por qué rechazó el founder? *"
                  : "Razón de rechazo (opcional)"}
              </label>
              <textarea
                value={statusModal.reason}
                onChange={(e) => setStatusModal((m) => m ? { ...m, reason: e.target.value } : m)}
                placeholder={statusModal.type === "Admitida"
                  ? "Excelente tracción, encaja perfecto con el programa..."
                  : statusModal.type === "Rechazada por founder"
                  ? "El founder indicó que el precio no se ajusta a su presupuesto..."
                  : "El MRR no cumple el mínimo requerido para esta cohorte..."}
                rows={3}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            {statusModal.type === "Admitida" && (
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                Se enviará automáticamente un email con el link de pago de Stripe.
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  if (statusModal.type === "Rechazada por founder" && !statusModal.reason.trim()) {
                    toast.error("Indicá la razón del rechazo del founder");
                    return;
                  }
                  await applyStatus(statusModal.recordId, statusModal.type as ApplicationStatus, statusModal.reason || undefined);
                  setStatusModal(null);
                }}
                disabled={!!updating}
                className={cn("flex-1", statusModal.type === "Admitida" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-600 hover:bg-red-700 text-white")}
              >
                {updating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Procesando...</> : statusModal.type === "Admitida" ? "Confirmar admisión" : "Confirmar rechazo"}
              </Button>
              <Button variant="outline" onClick={() => setStatusModal(null)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions modal */}
      {actionsModal && (
        <ActionsModalView
          app={actionsModal.app}
          coupons={coupons}
          onClose={() => setActionsModal(null)}
          onCouponAssign={assignCoupon}
          onAdmit={openAdmit}
          onReject={openReject}
          updating={updating}
        />
      )}
    </div>
  );
}
