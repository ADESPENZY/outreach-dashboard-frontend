import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import GoogleSignInSlot from '../GoogleSignInSlot';

/**
 * Google's own button, inside the existing GoogleSignInSlot (which keeps the
 * 6-second "blocked on this device" fallback).
 *
 * Google renders the button itself, so only its props change here. Width is
 * the form's width, measured before paint so a phone never sees a 400px button
 * overflow first; Google accepts 200–400.
 */
export default function AuthGoogleButton({ onSuccess, onError }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(400);

  useLayoutEffect(() => {
    const w = ref.current?.offsetWidth;
    if (w) setWidth(Math.min(400, Math.max(200, Math.floor(w))));
  }, []);

  return (
    <div ref={ref} className="flex min-h-[52px] w-full items-center">
      <GoogleSignInSlot>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          theme="filled_black"
          shape="pill"
          size="large"
          text="continue_with"
          width={width}
        />
      </GoogleSignInSlot>
    </div>
  );
}
