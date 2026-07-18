import fs from "node:fs";
import path from "node:path";
import { MarkdownView } from "./markdown-view";

export const dynamic = "force-dynamic";

interface Guia {
  slug: string;
  titulo: string;
  content: string;
}

// Quita el frontmatter YAML (--- ... ---) y devuelve { titulo, body }.
function parseGuia(raw: string, fallbackTitulo: string): { titulo: string; body: string } {
  // Normalizar CRLF → LF (los .md pueden venir con saltos de Windows).
  const text = raw.replace(/\r\n/g, "\n");
  let body = text;
  let titulo = fallbackTitulo;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    const yaml = fm[1];
    const m = yaml.match(/titulo:\s*"?(.+?)"?\s*$/m);
    if (m) titulo = m[1].trim();
    body = text.slice(fm[0].length);
  }
  return { titulo, body };
}

function loadGuias(): Guia[] {
  const dir = path.join(process.cwd(), "docs", "sop");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { titulo, body } = parseGuia(raw, file.replace(/\.md$/, ""));
      return { slug: file.replace(/\.md$/, ""), titulo, content: body };
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo));
}

export default async function GuiasPage({
  searchParams,
}: {
  searchParams?: Promise<{ g?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const guias = loadGuias();
  const activa = guias.find((g) => g.slug === params.g) ?? guias[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Guías</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Procesos operativos paso a paso (SOP) del equipo.
        </p>
      </div>

      {guias.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-400">
          No hay guías disponibles.
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Índice de guías */}
          {guias.length > 1 && (
            <nav className="w-56 shrink-0 space-y-1">
              {guias.map((g) => (
                <a
                  key={g.slug}
                  href={`/admin/guias?g=${g.slug}`}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    g.slug === activa.slug
                      ? "bg-blue-50 text-blue-700"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {g.titulo}
                </a>
              ))}
            </nav>
          )}

          {/* Contenido de la guía activa */}
          <article className="flex-1 min-w-0 bg-white rounded-xl border border-zinc-200 p-6 md:p-8 overflow-x-auto">
            <MarkdownView content={activa.content} />
          </article>
        </div>
      )}
    </div>
  );
}
