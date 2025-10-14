import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary'
  size?: 'default' | 'sm' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-xl border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
          {
            'border-border bg-bg text-text hover:bg-[#141416]': variant === 'default',
            'border-none bg-gradient-to-r from-primary to-primary-2 text-white shadow-[0_8px_30px_rgba(138,5,190,.25)] hover:shadow-[0_12px_40px_rgba(138,5,190,.35)]': variant === 'primary',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3': size === 'sm',
            'h-11 px-8': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }