import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm text-[#d7d7db] mb-1.5">
            {label}
          </label>
        )}
        <input
          className={cn(
            'w-full px-3.5 py-3 rounded-xl border border-border bg-[#101012] text-text outline-none transition-colors focus:border-primary',
            error && 'border-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-error mt-1">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted mt-1">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }