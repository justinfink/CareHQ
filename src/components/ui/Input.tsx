import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border border-[var(--color-border-default)] rounded-[10px]
            px-3.5 py-3 text-base text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent
            transition-all duration-150
            ${error ? 'border-[var(--color-status-alert)] ring-1 ring-[var(--color-status-alert)]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-xs text-[var(--color-status-alert)]">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
