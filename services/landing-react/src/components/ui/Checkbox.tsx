import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          className={cn(
            'mt-0.5 h-4 w-4 rounded border border-border bg-[#101012] text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0',
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="text-sm text-text leading-5">{label}</span>
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }