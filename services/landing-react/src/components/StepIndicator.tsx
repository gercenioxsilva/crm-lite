import { cn } from '../utils/cn'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex gap-2 mb-4.5">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            index < currentStep
              ? 'bg-gradient-to-r from-primary to-primary-2'
              : 'bg-[#242426]'
          )}
        />
      ))}
    </div>
  )
}