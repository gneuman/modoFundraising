"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Send, Tag, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponRecord } from "@/lib/airtable";

const DISCOUNT_OPTIONS = [10, 15, 20, 25, 50, 100];

export function CuponesManager({ initialCoupons }: { initialCoupons: CouponRecord[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);

  // Create coupon form
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState(50);
  const [newDesc, setNewDesc] = useState("");

  // Send coupon form
  const [sendEmail, setSendEmail] = useState("");
  const [sendFirstName, setSendFirstName] = useState("");
  const [sendCouponId, setSendCouponId] = useState("");
  const [sendPercent, setSendPercent] = useState(0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, percentOff: newPercent, code: newCode, description: newDesc }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Cupón ${newCode.toUpperCase()} creado en Stripe`);
      setShowCreateForm(false);
      setNewName(""); setNewCode(""); setNewDesc("");
      // Refresh
      const fresh = await fetch("/api/admin/coupons").then((r) => r.json());
      setCoupons(fresh);
    } catch {
      toast.error("Error al crear cupón");
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const coupon = coupons.find((c) => c.stripe_coupon_id === sendCouponId);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sendEmail,
          firstName: sendFirstName,
          couponId: sendCouponId,
          percentOff: coupon?.discount_percent ?? sendPercent,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Link enviado a ${sendEmail}`);
      // Copy to clipboard as bonus
      if (data.url) navigator.clipboard.writeText(data.url).catch(() => {});
      setShowSendForm(false);
      setSendEmail(""); setSendFirstName(""); setSendCouponId("");
    } catch {
      toast.error("Error al enviar link");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => { setShowCreateForm(!showCreateForm); setShowSendForm(false); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" /> Crear cupón
        </Button>
        <Button
          variant="outline"
          onClick={() => { setShowSendForm(!showSendForm); setShowCreateForm(false); }}
          className="flex items-center gap-2"
          disabled={coupons.length === 0}
        >
          <Send className="h-4 w-4" /> Enviar link con descuento
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-800 mb-4">Nuevo cupón</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1.5">Nombre (visible en Stripe)</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Beca Alumni MF" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1.5">Código</label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="ALUMNIMF50" required className="uppercase" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-2">Descuento</label>
              <div className="flex gap-2 flex-wrap">
                {DISCOUNT_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPercent(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      newPercent === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-blue-300"
                    }`}
                  >
                    {p === 100 ? "Beca completa (100%)" : `${p}% off`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-1.5">Descripción (interna)</label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Para alumni de ediciones anteriores" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creando...</> : "Crear en Stripe"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Send Form */}
      {showSendForm && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-800 mb-4">Enviar link de pago con descuento</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1.5">Email del founder</label>
                <Input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="founder@startup.com" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1.5">Nombre</label>
                <Input value={sendFirstName} onChange={(e) => setSendFirstName(e.target.value)} placeholder="Gabriel" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-1.5">Selecciona el cupón</label>
              <select
                value={sendCouponId}
                onChange={(e) => {
                  setSendCouponId(e.target.value);
                  const c = coupons.find((c) => c.stripe_coupon_id === e.target.value);
                  setSendPercent(c?.discount_percent ?? 0);
                }}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona un cupón</option>
                {coupons.filter((c) => c.active).map((c) => (
                  <option key={c.stripe_coupon_id} value={c.stripe_coupon_id}>
                    {c.code} — {c.discount_percent}% off {c.description ? `(${c.description})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : "Enviar por email"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSendForm(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons List */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
          <Tag className="h-4 w-4 text-zinc-400" />
          <h3 className="font-semibold text-zinc-700">Cupones activos</h3>
          <span className="text-xs text-zinc-400 ml-1">({coupons.filter((c) => c.active).length})</span>
        </div>
        {coupons.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">No hay cupones creados aún</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-50 bg-zinc-50">
                <th className="text-left px-5 py-3 font-semibold text-zinc-600">Código</th>
                <th className="text-left px-5 py-3 font-semibold text-zinc-600">Descuento</th>
                <th className="text-left px-5 py-3 font-semibold text-zinc-600">Descripción</th>
                <th className="text-left px-5 py-3 font-semibold text-zinc-600">Estado</th>
                <th className="text-left px-5 py-3 font-semibold text-zinc-600">Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-zinc-800">{c.code}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Código copiado"); }}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      c.discount_percent === 100 ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                    }`}>
                      {c.discount_percent === 100 ? "🎓 Beca completa" : `${c.discount_percent}% off`}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{c.description || "-"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${c.active ? "text-green-600" : "text-zinc-400"}`}>
                      {c.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-400 truncate max-w-xs">{c.stripe_coupon_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
