"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Undo2 } from "lucide-react";

export function RefundButton({
  email,
  amountRefundable,
  startup,
}: {
  email: string;
  amountRefundable: number;
  startup: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function doRefund() {
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? data.errors?.[0]?.error ?? "Error al reembolsar");
      }
      toast.success(
        `Reembolsados US$${data.totalRefunded.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })} a ${email}`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reembolsar");
    }
  }

  if (amountRefundable <= 0) return null;

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
      >
        <Undo2 className="h-3 w-3" />
        Reembolsar US${amountRefundable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500 mr-1">¿Reembolsar {startup}?</span>
      <button
        onClick={doRefund}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sí"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white hover:bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200 disabled:opacity-50"
      >
        No
      </button>
    </div>
  );
}
