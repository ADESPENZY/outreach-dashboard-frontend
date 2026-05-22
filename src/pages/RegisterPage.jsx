import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rocket, Eye, EyeOff, CheckCircle2, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import SmallSpinner from '../components/SmallSpinner';
import { useAuth } from '../context/AuthContext';

/* ─── FLOATING LABEL INPUT ─── */
function FloatingInput({ id, label, type = 'text', register, error, rightSlot }) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const floated = focused || hasValue;
  return (
    <div className="relative">
      <div className={`relative rounded-lg border transition-all duration-200 ${
        error
          ? 'border-red-500/60 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
          : focused
          ? 'border-[rgba(255,91,46,0.60)] shadow-[0_0_0_3px_rgba(184,46,7,0.15)]'
          : 'border-[rgba(255,255,255,0.10)]'
      } bg-[#000000]`}>
        <label
          htmlFor={id}
          className={`absolute left-3 transition-all duration-200 pointer-events-none font-roboto ${
            floated
              ? `top-1.5 text-[10px] ${error ? 'text-red-400' : 'text-[rgba(255,91,46,0.80)]'}`
              : 'top-1/2 -translate-y-1/2 text-sm text-[rgba(255,255,255,0.40)]'
          }`}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { setFocused(false); setHasValue(e.target.value.length > 0); }}
          onChange={(e) => setHasValue(e.target.value.length > 0)}
          className="w-full bg-transparent pt-5 pb-2 px-3 text-sm text-white font-roboto outline-none pr-10"
          {...register}
        />
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error && <p className="text-red-400 text-xs mt-1 font-roboto">{error}</p>}
    </div>
  );
}

const FEATURES = [
  'Smart AI-powered job matching & scoring',
  'Auto-tailored CVs for every application',
  'Cold email warmup & inbox reputation',
  'Real-time outreach analytics dashboard',
];

const TRUST_QUOTE = {
  text: "ApplyDIR cut my job search from 3 months to 3 weeks. I had 12 interviews lined up before I even updated my LinkedIn.",
  name: "Marcus T.",
  role: "Senior ML Engineer @ Scale AI",
  initial: "M",
};

const RegisterPage = () => {
  const { register, handleSubmit, formState, watch } = useForm();
  const { errors } = formState;
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const password = watch('password');

  const mutation = useMutation({
    mutationFn: (data) => authRegister(data),
    onSuccess: () => {
      toast.success("Account created successfully!");
      navigate('/dashboard/jobs', { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed');
    }
  });

  return (
    <section className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#0B0C10] text-white">
      {/* ── LEFT: Form Panel ── */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Rocket
            size={18}
            className="rotate-45"
            style={{ color: '#FF5B2E', filter: 'drop-shadow(0 0 6px rgba(255,91,46,0.50))' }}
          />
          <span className="font-montserrat font-semibold text-white text-lg">
            Apply
            <span className="font-extrabold bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent">
              DIR
            </span>
          </span>
        </motion.div>

        {/* Center block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-md w-full mx-auto my-auto"
        >
          {/* Heading */}
          <div className="flex items-start gap-3">
            <div
              className="w-0.5 h-8 rounded-full flex-shrink-0 mt-1"
              style={{ background: 'linear-gradient(to bottom, #B82E07, #FF5B2E)' }}
            />
            <div>
              <p className="text-[rgba(255,255,255,0.45)] font-montserrat text-sm mb-1">
                Get started,
              </p>
              <h1 className="text-white font-montserrat font-bold text-2xl leading-tight">
                Create your career pipeline.
              </h1>
            </div>
          </div>

          {/* Glass panel */}
          <div className="bg-[#12131C]/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl mt-8">
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
              <FloatingInput
                id="full_name"
                label="Full Name"
                register={register('full_name', { required: 'Full name is required' })}
                error={errors?.full_name?.message}
              />
              <FloatingInput
                id="email"
                label="Email Address"
                type="email"
                register={register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
                })}
                error={errors?.email?.message}
              />
              <FloatingInput
                id="username"
                label="Username"
                register={register('username', { required: 'Username is required' })}
                error={errors?.username?.message}
              />

              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  id="password"
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  register={register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Must be at least 8 characters' },
                    validate: {
                      hasUppercase: (v) => /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                      hasNumber: (v) => /[0-9]/.test(v) || 'Must contain at least one number',
                    },
                  })}
                  error={errors?.password?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                <FloatingInput
                  id="confirmPassword"
                  label="Confirm"
                  type={showConfirm ? 'text' : 'password'}
                  register={register('confirmPassword', {
                    required: 'Confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                  error={errors?.confirmPassword?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>

              <motion.button
                type="submit"
                disabled={mutation.isPending}
                whileHover={{ y: -1, boxShadow: '0 0 20px rgba(255,91,46,0.35), 0 0 40px rgba(184,46,7,0.20)' }}
                whileTap={{ y: 0, boxShadow: 'none' }}
                className="w-full h-12 rounded-lg text-white font-montserrat font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 mt-2"
                style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
              >
                {mutation.isPending ? (
                  <>
                    <SmallSpinner />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </motion.button>
            </form>

            <p className="text-[rgba(255,255,255,0.35)] text-sm font-roboto text-center mt-6">
              Already have an account?{' '}
              <Link
                to="/"
                className="text-[#FF5B2E] hover:text-[#B82E07] font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-[rgba(255,255,255,0.20)] text-xs font-roboto text-center">
          © 2025 Jatotech. Enterprise Automation Platform.
        </p>
      </div>

      {/* ── RIGHT: Value Panel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 60% 40%, #0D0E18 0%, #0B0C10 100%)' }}
      >
        {/* Background circuit grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FF5B2E 0%, transparent 70%)' }}
        />

        {/* Top: Value headline + feature list */}
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p className="text-[rgba(255,255,255,0.35)] font-montserrat text-xs tracking-widest uppercase mb-4">
              Your Career OS
            </p>
            <h2 className="text-4xl font-montserrat font-extrabold text-white leading-tight mb-4">
              Build your automated<br />
              <span className="bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent">
                career pipeline.
              </span>
            </h2>
            <p className="text-[rgba(255,255,255,0.50)] font-roboto text-sm leading-relaxed">
              Upload once, match forever. ApplyDIR&apos;s AI continuously hunts, scores, and applies
              to roles that fit — while you focus on what matters.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 space-y-3"
          >
            {FEATURES.map((f, i) => (
              <motion.li
                key={f}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 size={16} className="text-[#0A9396] flex-shrink-0" />
                <span className="text-[rgba(255,255,255,0.70)] text-sm font-roboto">{f}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Bottom: Trust quote */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="relative z-10 rounded-2xl border border-white/5 p-6"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)' }}
        >
          <Quote size={20} className="text-[rgba(255,91,46,0.40)] mb-3" />
          <p className="text-[rgba(255,255,255,0.75)] text-sm font-roboto italic leading-relaxed mb-4">
            &ldquo;{TRUST_QUOTE.text}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #B82E07, #FF5B2E)' }}
            >
              <span className="text-white text-xs font-montserrat font-bold">{TRUST_QUOTE.initial}</span>
            </div>
            <div>
              <p className="text-white text-xs font-montserrat font-semibold">{TRUST_QUOTE.name}</p>
              <p className="text-[rgba(255,255,255,0.40)] text-xs font-roboto">{TRUST_QUOTE.role}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default RegisterPage;
