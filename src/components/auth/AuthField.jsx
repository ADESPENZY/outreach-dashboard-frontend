import { forwardRef, useId } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

/**
 * Label above, shadcn Input restyled for the ink ground, error below.
 *
 * Forwards its ref to the <input>, so react-hook-form's register() spreads
 * straight onto it. `labelAside` sits right-aligned on the label row (the
 * "Forgot password?" link); `rightSlot` sits inside the field (the eye).
 */

const INPUT_CLASS =
  'h-[54px] rounded-[14px] border-white/15 bg-ink-stage px-4 py-0 text-base text-white shadow-none md:text-base ' +
  'placeholder:text-white/40 transition-[border-color,box-shadow] duration-200 hover:border-white/30 ' +
  'focus-visible:border-primary-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/20 ' +
  'aria-[invalid=true]:border-primary-tint/70';

const AuthField = forwardRef(function AuthField(
  {
    id,
    label,
    labelAside,
    error,
    invalid = false,
    describedBy,
    rightSlot,
    className,
    inputClassName,
    ...inputProps
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = `${fieldId}-error`;
  const isInvalid = invalid || Boolean(error);
  const describedByIds = [error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex min-h-[20px] items-center justify-between gap-3">
        <Label htmlFor={fieldId} className="text-sm font-medium text-white/80">
          {label}
        </Label>
        {labelAside}
      </div>

      <div className="relative">
        <Input
          ref={ref}
          id={fieldId}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedByIds}
          className={cn(INPUT_CLASS, rightSlot && 'pr-14', inputClassName)}
          {...inputProps}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{rightSlot}</div>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-[13.5px] text-primary-tint">
          {error}
        </p>
      )}
    </div>
  );
});

export default AuthField;
