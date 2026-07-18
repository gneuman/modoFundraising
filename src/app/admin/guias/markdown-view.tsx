"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renderiza el markdown de un SOP con estilos del admin (sin depender de
// @tailwindcss/typography, que puede no estar instalado). Estilos inline por
// elemento para control total.
export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-zinc-800 mt-8 mb-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-zinc-800 mt-8 mb-2 pb-1.5 border-b border-zinc-100">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-zinc-700 mt-5 mb-1.5">{children}</h3>
        ),
        p: ({ children }) => <p className="text-sm text-zinc-600 leading-relaxed my-2.5">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2.5 text-sm text-zinc-600">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2.5 text-sm text-zinc-600">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-800">{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} className="text-blue-600 hover:text-blue-700 underline">{children}</a>
        ),
        code: ({ children }) => (
          <code className="text-xs bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded font-mono">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-amber-300 bg-amber-50 pl-4 py-1 my-3 text-sm text-zinc-700 rounded-r">{children}</blockquote>
        ),
        hr: () => <hr className="my-6 border-zinc-100" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
