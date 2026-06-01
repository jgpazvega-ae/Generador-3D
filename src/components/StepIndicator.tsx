import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentIndex: number;
}

export default function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${done ? 'bg-indigo-600 text-white' : ''}
                  ${active ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110' : ''}
                  ${!done && !active ? 'bg-[#1a1a38] text-slate-500 border border-[#2a2a4a]' : ''}
                `}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block transition-colors ${
                  active ? 'text-indigo-400' : done ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-1 transition-colors duration-300 ${
                  done ? 'bg-indigo-600' : 'bg-[#1a1a38]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
