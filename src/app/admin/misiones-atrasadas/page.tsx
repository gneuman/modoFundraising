import { headers } from "next/headers";
import { Clock, Info } from "lucide-react";
import { crearTokenDia, hoyPrograma } from "@/lib/late-token";
import { LinkAtrasadas } from "@/components/admin/link-atrasadas";

export const dynamic = "force-dynamic";

// Panel admin (OP-1905): genera el link del día para destrabar founders
// atrasados. El link solo abre hoy; lo que el founder envíe queda marcado como
// entrega tardía. El equipo copia y lo manda — nunca genera tokens a mano.
export default async function MisionesAtrasadasPage() {
  const token = await crearTokenDia();
  const dia = hoyPrograma();

  // Host del portal para armar la URL absoluta. El portal vive en
  // portal.modofundraising.com; en local usamos el host de la request.
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "portal.modofundraising.com";
  const proto = host.includes("localhost") ? "http" : "https";
  const url = `${proto}://${host}/portal/misiones/todas?t=${token}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Ponerse al día</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Link para que founders atrasados contesten todas las misiones
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Clock className="h-4 w-4 text-blue-500" />
          Link de hoy ({dia})
        </div>
        <LinkAtrasadas url={url} />
        <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg p-3">
          <Info className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
          <div className="space-y-1">
            <p>
              Manda este link al founder atrasado. Al abrirlo con su sesión verá
              <strong> todas las misiones</strong> y podrá contestarlas.
            </p>
            <p>
              Todo lo que envíe por este link queda marcado como
              <strong> entrega tardía</strong> en Airtable (campos{" "}
              <code>atrasado</code> y <code>fecha_entrega_tardia</code>).
            </p>
            <p>
              El link <strong>caduca a fin del día</strong>. Mañana entra aquí y
              copia el nuevo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
