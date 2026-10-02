import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MotionConfig, motion, useAnimate, useReducedMotion } from 'framer-motion';
import InstallButton from '../components/InstallButton';
import UsernamePickerModal from '../components/UsernamePickerModal';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import PasswordField from '../components/auth/PasswordField';
import PillButton from '../components/auth/PillButton';
import AuthGoogleButton from '../components/auth/AuthGoogleButton';
import {
  DONE_HOLD_MS, FOCUS_RING, SHAKE_TRANSITION, SHAKE_X, riseContainer, riseItem,
} from '../components/auth/authMotion';

const ERROR_ID = 'login-error';

/** Server message for a failed sign-in. Same wording rules as before the redesign. */
function loginErrorMessage(err) {
  if (err.response?.status === 401) {
    return err.response?.data?.detail || 'Invalid username or password. Please check your credentials.';
  }
  const msg = err.response?.data?.detail || err.message || 'Invalid username or password. Please try again.';
  return msg.trimStart().startsWith('<') ? 'Something went wrong on our end. Please try again shortly.' : msg;
}

const LoginPage = () => {
  const { register, handleSubmit } = useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);
  const [formError, setFormError] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  const [fieldsScope, animateFields] = useAnimate();
  const reduceMotion = useReducedMotion();

  const redirectTimer = useRef(null);
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const from = location?.state?.from?.pathname || '/dashboard';

  const fail = (message) => {
    setFormError(message);
    if (!reduceMotion && fieldsScope.current) {
      animateFields(fieldsScope.current, { x: SHAKE_X }, SHAKE_TRANSITION);
    }
  };
  const clearError = () => setFormError('');

  const googleInFlight = useRef(false);
  const handleGoogleSuccess = async (credentialResponse) => {
    // Re-entrancy guard: ignore a second tap while the first request is running,
    // so "Sign in with Google" can't fire twice.
    if (googleInFlight.current) return;
    googleInFlight.current = true;
    try {
      const { isNew } = await loginWithGoogle(credentialResponse.credential);
      if (isNew) {
        setShowUsernamePicker(true);
        return;
      }
      toast.success('Signed in with Google!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      googleInFlight.current = false;
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: () => {
      // Let the check land, then the same redirect as before.
      setSignedIn(true);
      redirectTimer.current = setTimeout(() => navigate(from, { replace: true }), DONE_HOLD_MS);
    },
    onError: (err) => fail(loginErrorMessage(err)),
  });

  const onValid = (data) => {
    if (mutation.isPending || signedIn) return;
    clearError();
    mutation.mutate(data);
  };
  const onInvalid = () => fail('Enter your username and password.');

  const status = signedIn ? 'done' : mutation.isPending ? 'busy' : 'idle';
  const describedBy = formError ? ERROR_ID : undefined;

  return (
    <MotionConfig reducedMotion="user">
      {showUsernamePicker && (
        <UsernamePickerModal onDone={() => { setShowUsernamePicker(false); navigate(from, { replace: true }); }} />
      )}

      <AuthShell headerRight={<InstallButton />}>
        <motion.div variants={riseContainer} initial="hidden" animate="show">
          <motion.div variants={riseItem}>
            <h1 className="text-[38px] font-bold leading-[1.04] tracking-[-0.03em] lg:text-[52px] lg:leading-[1.02] lg:tracking-[-0.032em]">
              Welcome back.
            </h1>
            <p className="mt-3 hidden text-[17px] leading-normal text-white/70 lg:block">
              Your introductions are where you left them.
            </p>
          </motion.div>

          <motion.form
            variants={riseItem}
            onSubmit={handleSubmit(onValid, onInvalid)}
            noValidate
            className="mt-8 lg:mt-10"
          >
            <div ref={fieldsScope} className="flex flex-col gap-5">
              <AuthField
                id="username"
                label="Username"
                placeholder="Your username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                invalid={Boolean(formError)}
                describedBy={describedBy}
                {...register('username', { required: true, onChange: clearError })}
              />
              <PasswordField
                id="password"
                label="Password"
                placeholder="Your password"
                autoComplete="current-password"
                invalid={Boolean(formError)}
                describedBy={describedBy}
                labelAside={
                  <Link
                    to="/forgot-password"
                    className={`-my-3 inline-flex min-h-11 items-center rounded-sm text-sm text-primary-light transition-colors hover:text-primary-tint lg:my-0 lg:min-h-0 ${FOCUS_RING}`}
                  >
                    Forgot password?
                  </Link>
                }
                {...register('password', { required: true, onChange: clearError })}
              />

              {formError && (
                <p id={ERROR_ID} role="alert" className="text-[13.5px] text-primary-tint">
                  {formError}
                </p>
              )}
            </div>

            <PillButton status={status} doneLabel="Signed in" className="mt-7">
              Sign in
            </PillButton>
          </motion.form>

          <motion.div variants={riseItem} className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-[0.14em] text-white/60">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </motion.div>

          <motion.div variants={riseItem}>
            <AuthGoogleButton
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed. Please try again.')}
            />
          </motion.div>

          <motion.p variants={riseItem} className="mt-6 text-[15px] text-white/70">
            New here?{' '}
            <Link
              to="/register"
              className={`inline-flex min-h-11 items-center rounded-sm font-semibold text-primary-light transition-colors hover:text-primary-tint lg:min-h-0 ${FOCUS_RING}`}
            >
              Create an account
            </Link>
          </motion.p>
        </motion.div>
      </AuthShell>
    </MotionConfig>
  );
};

export default LoginPage;
