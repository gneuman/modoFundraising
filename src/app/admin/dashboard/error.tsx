"use client";

export default function DashboardError({ error }: { error: Error }) {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold text-red-600">Error cargando dashboard</h1>
      <pre className="text-sm bg-red-50 border border-red-200 rounded p-4 overflow-auto whitespace-pre-wrap">
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
    </div>
  );
}
