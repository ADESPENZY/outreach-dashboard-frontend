import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rocket, Eye, EyeOff, CheckCircle2, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import SmallSpinner from '../components/SmallSpinner';
import { useAuth } from '../context/AuthContext';

/* ─── PREMIUM FIELD ─── */
function Field({ id, label, type = 'text', register, error, rightSlot }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          className={`w-full border border-gray-200/60 bg-gray-50/50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-primary-light/40 focus:ring-4 focus:ring-primary-light/10 transition-all duration-200${rightSlot ? ' pr-10' : ''}`}
          {...register}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
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
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed');
    }
  });

  return (
    <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">

      {/* ── LEFT: Form Panel (light) ── */}
      <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-10">

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Rocket
            size={18}
            className="rotate-45"
            style={{ color: '#FF5B2E', filter: 'drop-shadow(0 0 5px rgba(255,91,46,0.40))' }}
          />
          <span className="font-montserrat font-semibold text-gray-900 text-lg">
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
          {/* Page heading */}
          <div className="flex items-start gap-3 mb-8">
            <div
              className="w-0.5 h-8 rounded-full flex-shrink-0 mt-1"
              style={{ background: 'linear-gradient(to bottom, #B82E07, #FF5B2E)' }}
            />
            <div>
              <p className="text-gray-500 font-montserrat text-sm mb-1">
                Get started,
              </p>
              <h1 className="text-gray-900 font-montserrat font-bold text-2xl leading-tight">
                Create your career pipeline.
              </h1>
            </div>
          </div>

          {/* Premium floating white card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-8">
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-5">

              <Field
                id="full_name"
                label="Full Name"
                register={register('full_name', { required: 'Full name is required' })}
                error={errors?.full_name?.message}
              />

              <Field
                id="email"
                label="Email Address"
                type="email"
                register={register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
                })}
                error={errors?.email?.message}
              />

              <Field
                id="username"
                label="Username"
                register={register('username', { required: 'Username is required' })}
                error={errors?.username?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="password"
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  register={register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Must be at least 8 characters' },
                    validate: {
                      hasUppercase: (v) => /[A-Z]/.test(v) || 'Needs an uppercase letter',
                      hasNumber:    (v) => /[0-9]/.test(v) || 'Needs a number',
                    },
                  })}
                  error={errors?.password?.message}
                  rightSlot={
                    <button type="button" onClick={() => setShowPass((p) => !p)}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                <Field
                  id="confirmPassword"
                  label="Confirm"
                  type={showConfirm ? 'text' : 'password'}
                  register={register('confirmPassword', {
                    required: 'Confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                  error={errors?.confirmPassword?.message}
                  rightSlot={
                    <button type="button" onClick={() => setShowConfirm((p) => !p)}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-12 rounded-xl text-white font-montserrat font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 mt-1"
                style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
              >
                {mutation.isPending ? (
                  <><SmallSpinner /><span>Creating account...</span></>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            <p className="text-gray-500 text-sm text-center mt-6">
              Already have an account?{' '}
              <Link to="/" className="text-primary-light hover:text-primary-dark font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-gray-400 text-xs font-roboto text-center">
          © 2025 Jatotech. Enterprise Automation Platform.
        </p>
      </div>

      {/* ── RIGHT: Brand Panel (dark, immersive) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.7 }}
        className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-slate-900 min-h-screen"
      >
        {/* Glow orb — top right */}
        <div
          className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(184,46,7,0.22) 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
        {/* Glow orb — bottom left */}
        <div
          className="absolute -bottom-32 -left-32 w-[440px] h-[440px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,91,46,0.14) 0%, transparent 70%)', filter: 'blur(100px)' }}
        />

        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* ── Top: Headline + feature list ── */}
        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.65 }}
          >
            <p className="text-white/35 font-montserrat text-[10px] tracking-[0.22em] uppercase mb-6">
              Your Career OS
            </p>
            <h2 className="text-[3.25rem] font-montserrat font-extrabold text-white leading-[1.08] mb-5">
              Stop applying.<br />
              <span className="bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent">
                Start landing.
              </span>
            </h2>
            <p className="text-white/50 font-roboto text-[0.9375rem] leading-relaxed">
              ApplyDIR's AI hunts for roles, scores every match, and tailors your CV
              and cold email — automatically. Upload once. Let the pipeline work.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.62, duration: 0.5 }}
            className="mt-10 space-y-4"
          >
            {FEATURES.map((f, i) => (
              <motion.li
                key={f}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.68 + i * 0.08, duration: 0.42 }}
                className="flex items-center gap-3.5"
              >
                <div className="w-[22px] h-[22px] rounded-full bg-primary-light/15 border border-primary-light/25 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} style={{ color: '#FF5B2E' }} />
                </div>
                <span className="text-white/70 text-sm font-roboto">{f}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* ── Bottom: Testimonial ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.88, duration: 0.55 }}
          className="relative z-10"
        >
          <div className="w-10 h-px bg-white/10 mb-8" />

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-sm">
            <Quote size={18} className="mb-4" style={{ color: 'rgba(255,91,46,0.50)' }} />
            <p className="text-white/88 text-xl font-medium font-roboto leading-relaxed mb-6">
              &ldquo;{TRUST_QUOTE.text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #B82E07, #FF5B2E)' }}
              >
                <span className="text-white text-sm font-montserrat font-bold">{TRUST_QUOTE.initial}</span>
              </div>
              <div>
                <p className="text-white/90 text-sm font-montserrat font-semibold">{TRUST_QUOTE.name}</p>
                <p className="text-white/40 text-xs font-roboto mt-0.5">{TRUST_QUOTE.role}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

    </section>
  );
};

export default RegisterPage;
