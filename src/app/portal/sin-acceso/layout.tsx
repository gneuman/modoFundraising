// This page is intentionally outside the access-check portal layout
export default function SinAccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
    </div>
  );
}
