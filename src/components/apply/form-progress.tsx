"use client";

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function FormProgress({ currentStep, totalSteps, stepLabels }: FormProgressProps) {
  const percent = Math.round(((currentStep) / totalSteps) * 100);

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-zinc-600">
          Sección {currentStep} de {totalSteps}: {stepLabels[currentStep - 1]}
        </span>
        <span className="text-sm font-semibold text-blue-600">{percent}%</span>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
