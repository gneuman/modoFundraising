"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { ManualPaymentModal } from "@/components/admin/manual-payment-modal";

interface Props {
  recordId: string;
  startupName: string;
  contactName?: string;
  paymentStatus?: string | null;
  totalCuotas?: number | null;
}

export function EmpresaPagoButton({ recordId, startupName, contactName, paymentStatus, totalCuotas }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Ocultar solo cuando ya se pagó el plan COMPLETO. Antes se comparaba contra
  // "Cuota 3 pagada" fijo, lo que escondía el botón en planes de 4 cuotas.
  const total = totalCuotas ?? 3;
  const pagadas = parseInt(
    (paymentStatus ?? "").match(/Cuota (\d+) pagada/)?.[1] ?? "0",
    10,
  );
  if (pagadas >= total || paymentStatus === "Baja") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Marcar pago manual"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors"
      >
        <Banknote className="h-3.5 w-3.5" />
        Pago manual
      </button>
      {open && (
        <ManualPaymentModal
          recordId={recordId}
          startupName={startupName}
          contactName={contactName}
          paymentStatus={paymentStatus}
          onClose={() => setOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
