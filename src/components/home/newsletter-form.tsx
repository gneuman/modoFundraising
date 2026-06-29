"use client";

interface NewsletterFormProps {
  compact?: boolean;
}

export function NewsletterForm({ compact = false }: NewsletterFormProps) {
  if (compact) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="email"
          placeholder="tu@email.com"
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-(--brand-teal)/50 text-xs"
        />
        <button
          type="submit"
          className="bg-(--brand-teal) hover:bg-(--brand-teal-dark) text-(--brand-navy) font-bold px-3 py-2 rounded-lg transition-colors text-xs"
        >
          OK
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        placeholder="tu@email.com"
        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-(--brand-teal)/50 text-sm"
      />
      <button
        type="submit"
        className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
      >
        Suscribir
      </button>
    </form>
  );
}
