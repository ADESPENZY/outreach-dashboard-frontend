import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AuthField from './AuthField';
import { FOCUS_RING } from './authMotion';

/** AuthField with a show/hide toggle. The toggle is a 44px icon button. */
const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      ref={ref}
      type={visible ? 'text' : 'password'}
      {...props}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white ${FOCUS_RING}`}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
});

export default PasswordField;
