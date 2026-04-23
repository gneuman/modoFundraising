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
      <label className="block text-sm font-medium text-white/80">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-white/40">{help}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
