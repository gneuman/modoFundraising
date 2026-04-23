"use client";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, required, error, help, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-zinc-400">{help}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
