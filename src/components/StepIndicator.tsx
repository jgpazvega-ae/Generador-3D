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
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-500
                  ${done ? 'step-done text-white' : ''}
                  ${active ? 'step-active text-white scale-110' : ''}
                  ${!done && !active ? 'step-pending' : ''}
                `}
              >
                {done ? <Check className="w-4 h-4 stroke-[2.5]" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium hidden sm:block transition-colors duration-300 ${
                  active ? 'text-indigo-400' : done ? 'text-emerald-500/70' : 'text-slate-600'
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="relative h-px w-12 sm:w-20 mx-1.5 mb-4 sm:mb-0 overflow-hidden rounded-full"
                   style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-full"
                  style={{
                    width: done ? '100%' : '0%',
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    boxShadow: done ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
