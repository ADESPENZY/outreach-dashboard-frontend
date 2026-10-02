import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion,
} from 'framer-motion';
import { Check } from 'lucide-react';
import UsernamePickerModal from '../components/UsernamePickerModal';
import { useAuth } from '../context/AuthContext';
import { Checkbox } from '../components/ui/checkbox';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import PasswordField from '../components/auth/PasswordField';
import PillButton from '../components/auth/PillButton';
import AuthGoogleButton from '../components/auth/AuthGoogleButton';
import SignupStory from '../components/auth/SignupStory';
import SignupIntroSlides, { shouldShowSignupIntro } from '../components/auth/SignupIntroSlides';
import {
  FOCUS_RING, SHAKE_TRANSITION, SHAKE_X, SIGNUP_DONE_HOLD_MS,
  checkPop, chipsRow, riseContainer, riseItem,
} from '../components/auth/authMotion';

/**
 * Signup in two steps, one request (AUTH_DESIGN_GUIDE.md §5).
 *
 * Step 1: email + consent. Step 2: name, username, password. The request body
 * is exactly { full_name, email, username, password } to the same endpoint as
 * before. Password rules are today's (8+ chars, an uppercase, a number); the
 * confirm field is gone, the eye replaces it.
 */

const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const EMAIL_MESSAGE = 'Enter a valid email address.';
const CONSENT_MESSAGE = 'Tick the box to continue.';
const EMPTY_MESSAGE = 'Fill in all three to continue.';
const DOMAINS = ['@gmail.com', '@outlook.com', '@yahoo.com'];
const STEP2_FIELDS = ['full_name', 'username', 'password'];

const H1 = 'text-[38px] font-bold leading-[1.04] tracking-[-0.03em] lg:text-[52px] lg:leading-[1.02] lg:tracking-[-0.032em]';
const LEAD = 'mt-3 text-base leading-normal text-white/70 lg:text-[17px]';
const EYEBROW = 'mb-4 text-xs uppercase tracking-[0.14em] text-white/60';
const TEXT_LINK = `rounded-sm font-semibold text-primary-light transition-colors hover:text-primary-tint ${FOCUS_RING}`;
const ERROR_TEXT = 'text-[13.5px] text-primary-tint';
// Inline links in the consent sentence: an invisible pseudo-element takes the
// tap target to 44px without changing the line height.
const CONSENT_LINK = `relative after:absolute after:-inset-x-1 after:-inset-y-3 ${TEXT_LINK}`;

const firstMessage = (v) => (Array.isArray(v) ? v[0] : typeof v === 'string' ? v : null);

const RegisterPage = () => {
  const {
    register, control, handleSubmit, trigger, watch, setValue, getValues,
    setError, clearErrors, setFocus, formState: { errors },
  } = useForm({
    defaultValues: { email: '', agreed: false, full_name: '', username: '', password: '' },
  });
  const navigate = useNavigate();
  const { register: authRegister, loginWithGoogle } = useAuth();
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);
  const [step, setStep] = useState(1); // 1 | 2 | 'done'

  // Phone, first visit: intro slides before the form. Read before first paint
  // so a returning visitor never sees them flash. Widening to desktop drops
  // them (without marking them seen).
  const [showIntro, setShowIntro] = useState(shouldShowSignupIntro);
  useEffect(() => {
    if (!showIntro || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => { if (e.matches) setShowIntro(false); };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [showIntro]);
  const [cameBack, setCameBack] = useState(false);
  const [blockError, setBlockError] = useState('');

  const reduceMotion = useReducedMotion();
  const [emailScope, animateEmail] = useAnimate();
  const [consentScope, animateConsent] = useAnimate();
  const [step2Scope, animateStep2] = useAnimate();
  const shake = (scope, animate) => {
    if (!reduceMotion && scope.current) animate(scope.current, { x: SHAKE_X }, SHAKE_TRANSITION);
  };

  const doneTimer = useRef(null);
  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const email = watch('email') || '';
  const showChips = email.length > 0 && !email.includes('@');

  /* ── Google (unchanged flow; the consent gate now shakes inline) ───── */

  const googleInFlight = useRef(false);
  const handleGoogleSuccess = async (credentialResponse) => {
    // Re-entrancy guard: ignore a second tap while the first request is running.
    if (googleInFlight.current) return;
    if (getValues('agreed') !== true) {
      setError('agreed', { type: 'validate', message: CONSENT_MESSAGE });
      shake(consentScope, animateConsent);
      return;
    }
    googleInFlight.current = true;
    try {
      const { isNew } = await loginWithGoogle(credentialResponse.credential);
      if (isNew) {
        setShowUsernamePicker(true);
        return;
      }
      toast.success('Welcome aboard!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      googleInFlight.current = false;
    }
  };

  /* ── Step 1 → 2 ───────────────────────────────────────────────────── */

  const onContinue = async (e) => {
    e.preventDefault();
    const emailOk = await trigger('email');
    const consentOk = await trigger('agreed');
    if (!emailOk) shake(emailScope, animateEmail);
    if (!consentOk) shake(consentScope, animateConsent);
    if (emailOk && consentOk) setStep(2);
  };

  const addDomain = (domain) => {
    setValue('email', `${email}${domain}`);
    clearErrors('email');
    setFocus('email');
  };

  const backToStep1 = () => {
    setCameBack(true);
    setStep(1);
  };

  /* ── Step 2: create the account ───────────────────────────────────── */

  const mutation = useMutation({
    mutationFn: (body) => authRegister(body),
    onSuccess: () => {
      setStep('done');
      doneTimer.current = setTimeout(() => navigate('/dashboard', { replace: true }), SIGNUP_DONE_HOLD_MS);
    },
    onError: (err) => {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        let placed = false;
        STEP2_FIELDS.forEach((f) => {
          const msg = firstMessage(data[f]);
          if (msg) {
            setError(f, { type: 'server', message: msg });
            placed = true;
          }
        });
        // An email problem belongs to step 1: go back and show it there.
        const emailMsg = firstMessage(data.email);
        if (emailMsg) {
          setError('email', { type: 'server', message: emailMsg });
          backToStep1();
          return;
        }
        if (placed) {
          shake(step2Scope, animateStep2);
          return;
        }
      }
      // Throttle, server crash, anything not tied to a field.
      const msg = err.message || 'Registration failed. Please try again.';
      setBlockError(msg.trimStart().startsWith('<') ? 'Something went wrong on our end. Please try again shortly.' : msg);
      shake(step2Scope, animateStep2);
    },
  });

  const onCreate = ({ full_name, email: emailValue, username, password }) => {
    if (mutation.isPending) return;
    setBlockError('');
    mutation.mutate({ full_name, email: emailValue, username, password });
  };

  const onCreateInvalid = (errs) => {
    if (STEP2_FIELDS.some((f) => errs[f]?.type === 'required')) setBlockError(EMPTY_MESSAGE);
    shake(step2Scope, animateStep2);
  };

  // Empty-field errors are told once, at the block; rule and server errors sit
  // under their own field.
  const fieldError = (name) => (errors[name] && errors[name].type !== 'required' ? errors[name].message : undefined);
  const step2Change = (name) => () => {
    clearErrors(name);
    setBlockError('');
  };

  if (showIntro) {
    return (
      <MotionConfig reducedMotion="user">
        <SignupIntroSlides onDone={() => setShowIntro(false)} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {showUsernamePicker && (
        <UsernamePickerModal onDone={() => { setShowUsernamePicker(false); navigate('/dashboard', { replace: true }); }} />
      )}

      <AuthShell story={<SignupStory />}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={riseContainer} initial="hidden" animate="show" exit="exit">
              <motion.div variants={riseItem}>
                <p className={EYEBROW}>Step 1 of 2</p>
                <h1 className={H1}>Get introduced.</h1>
                <p className={LEAD}>Create your account. Nothing is sent until you approve it.</p>
              </motion.div>

              <motion.form variants={riseItem} onSubmit={onContinue} noValidate className="mt-8 lg:mt-10">
                <div ref={emailScope}>
                  <AuthField
                    id="email"
                    label="Email address"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus={cameBack}
                    error={errors.email?.message}
                    {...register('email', {
                      required: EMAIL_MESSAGE,
                      pattern: { value: EMAIL_PATTERN, message: EMAIL_MESSAGE },
                      onChange: () => clearErrors('email'),
                    })}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {showChips && (
                    <motion.div key="chips" {...chipsRow} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-2 lg:gap-2 lg:pt-2.5">
                        {DOMAINS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => addDomain(d)}
                            className={`inline-flex h-11 items-center rounded-full border border-white/15 px-2.5 text-[13px] text-white/80 transition-colors hover:border-white/30 hover:text-white lg:h-9 lg:px-3.5 lg:text-sm ${FOCUS_RING}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={consentScope} className="mt-5">
                  <div className="flex min-h-11 items-start gap-3">
                    <Controller
                      name="agreed"
                      control={control}
                      rules={{ validate: (v) => v === true || CONSENT_MESSAGE }}
                      render={({ field }) => (
                        <Checkbox
                          id="agree"
                          ref={field.ref}
                          checked={field.value === true}
                          onCheckedChange={(v) => { field.onChange(v === true); clearErrors('agreed'); }}
                          onBlur={field.onBlur}
                          aria-invalid={Boolean(errors.agreed) || undefined}
                          aria-describedby={errors.agreed ? 'agree-error' : undefined}
                          className={`relative mt-0.5 h-5 w-5 rounded-[6px] after:absolute after:-inset-3 border-white/30 bg-ink-stage shadow-none data-[state=checked]:border-primary-light data-[state=checked]:bg-primary-light data-[state=checked]:text-ink ${FOCUS_RING}`}
                        />
                      )}
                    />
                    <label htmlFor="agree" className="flex-1 cursor-pointer select-none text-sm leading-relaxed text-white/70">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" rel="noopener noreferrer" className={CONSENT_LINK}>Terms</Link>
                      {' '}and{' '}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className={CONSENT_LINK}>Privacy Policy</Link>
                    </label>
                  </div>
                  {errors.agreed && (
                    <p id="agree-error" role="alert" className={`mt-1 ${ERROR_TEXT}`}>{errors.agreed.message}</p>
                  )}
                </div>

                <PillButton className="mt-6">Continue</PillButton>
                <p className="mt-4 text-center text-sm text-white/60">Free during early access · No card</p>
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
                Already have an account?{' '}
                <Link to="/login" className={`inline-flex min-h-11 items-center lg:min-h-0 ${TEXT_LINK}`}>Sign in</Link>
              </motion.p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={riseContainer} initial="hidden" animate="show" exit="exit">
              <motion.div variants={riseItem}>
                <p className={EYEBROW}>Step 2 of 2</p>
                <h1 className={H1}>Almost there.</h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 text-base text-white/70">
                  <span className="min-w-0 break-all">
                    Signing up as <strong className="font-semibold text-white">{email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={backToStep1}
                    className={`inline-flex min-h-11 items-center lg:min-h-0 ${TEXT_LINK}`}
                  >
                    Change
                  </button>
                </p>
              </motion.div>

              <motion.form
                variants={riseItem}
                onSubmit={handleSubmit(onCreate, onCreateInvalid)}
                noValidate
                className="mt-8 lg:mt-10"
              >
                <div ref={step2Scope} className="flex flex-col gap-5">
                  <AuthField
                    id="full_name"
                    label="Full name"
                    placeholder="As it appears on your CV"
                    autoComplete="name"
                    autoFocus
                    invalid={Boolean(errors.full_name)}
                    error={fieldError('full_name')}
                    {...register('full_name', { required: true, onChange: step2Change('full_name') })}
                  />
                  <AuthField
                    id="username"
                    label="Username"
                    placeholder="Pick a username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    invalid={Boolean(errors.username)}
                    error={fieldError('username')}
                    {...register('username', { required: true, onChange: step2Change('username') })}
                  />
                  <PasswordField
                    id="password"
                    label="Password"
                    placeholder="Create a password"
                    autoComplete="new-password"
                    invalid={Boolean(errors.password)}
                    error={fieldError('password')}
                    {...register('password', {
                      required: true,
                      minLength: { value: 8, message: 'Min 8 characters' },
                      validate: {
                        hasUppercase: (v) => /[A-Z]/.test(v) || 'Needs uppercase',
                        hasNumber: (v) => /[0-9]/.test(v) || 'Needs a number',
                      },
                      onChange: step2Change('password'),
                    })}
                  />

                  {blockError && <p role="alert" className={ERROR_TEXT}>{blockError}</p>}
                </div>

                <PillButton status={mutation.isPending ? 'busy' : 'idle'} className="mt-7">
                  Create account
                </PillButton>
              </motion.form>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" variants={riseContainer} initial="hidden" animate="show" role="status">
              <motion.div
                {...checkPop}
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary-light text-ink"
              >
                <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
              <motion.div variants={riseItem}>
                <h1 className={`mt-8 ${H1}`}>You&rsquo;re in.</h1>
                <p className={LEAD}>Taking you to setup.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthShell>
    </MotionConfig>
  );
};

export default RegisterPage;
