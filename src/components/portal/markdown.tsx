import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renderer compartido para campos editables desde Airtable (instrucciones de
// misiones, descripciones largas, etc). Tipografia tight para no inflar las
// cards y links auto-detectados gracias a remark-gfm.
//
// Si necesitas cambiar el estilo de un tipo de elemento, edita el componente
// correspondiente en `components` abajo — esos overrides controlan el render
// de cada nodo del markdown.
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`text-sm text-zinc-700 leading-relaxed space-y-2 ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-800">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="text-base font-bold text-zinc-800 mt-3 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-bold text-zinc-800 mt-3 mb-1">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold text-zinc-800 mt-2 mb-1">{children}</h4>,
          code: ({ children }) => (
            <code className="bg-zinc-100 text-zinc-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-200 pl-3 italic text-zinc-500">{children}</blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
