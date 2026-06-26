"use client";

import { useState } from "react";
import { NuevaClaseForm, type ClaseWithContent } from "@/components/admin/nueva-clase-form";
import { ClaseCard } from "@/components/clases/clase-card";

export function ClasesList({ initialClases }: { initialClases: ClaseWithContent[] }) {
  const [clases, setClases] = useState<ClaseWithContent[]>(initialClases);

  function updateClase(updated: ClaseWithContent) {
    setClases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  const ordenadas = [...clases].sort((a, b) => (a.semana ?? 99) - (b.semana ?? 99));

  return (
    <div className="space-y-4">
      <NuevaClaseForm onCreated={(c) => setClases((prev) => [...prev, c])} />

      {clases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-400">
          No hay clases todavía. Crea la primera arriba.
        </div>
      ) : (
        <div className="space-y-3">
          {ordenadas.map((clase) => (
            <ClaseCard
              key={clase.id}
              clase={clase}
              mode="admin"
              onChange={(updated) => updateClase(updated as ClaseWithContent)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
