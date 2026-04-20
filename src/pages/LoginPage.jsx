import { useMutation } from '@tanstack/react-query';
import { Zap, ArrowRight, Shield, Sparkles, TrendingUp, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { login } from '../services/apiBlog';

const FEATURES = [
  { icon: Sparkles, label: 'AI-personalized cold emails in seconds' },
  { icon: TrendingUp, label: 'Auto job scraping from LinkedIn & Adzuna' },
  { icon: Mail,      label: 'Inbox warm-up & rotation built in' },
  { icon: Shield,    label: 'Secure, encrypted, always in control' },
];

const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm();
  const { errors } = formState;
  const location = useLocation();
  const navigate  = useNavigate();

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: (response) => {
      if (!response.access || !response.refresh) {
        toast.error('Invalid response from server');
        return;
      }
      localStorage.setItem('access',  response.access);
      localStorage.setItem('refresh', response.refresh);
      toast.success('Welcome back!');
      setTimeout(() => {
        const from = location?.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 100);
    },
    onError: (err) => toast.error(err.message || 'Login failed'),
  });

  return (
    <div className="min-h-screen flex font-montserrat">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#0D0D0D] flex-col justify-between overflow-hidden px-14 py-14">

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow blob */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#FF5B2E] opacity-[0.12] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] rounded-full bg-[#B82E07] opacity-[0.10] blur-[100px] pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] flex items-center justify-center shadow-lg shadow-[#FF5B2E]/30">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white text-xl font-black tracking-tight">
            Jato<span className="text-[#FF5B2E]">tech</span>
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5B2E] animate-pulse" />
              <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">Outreach Automation</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Land interviews<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5B2E] to-[#FFB347]">
                on autopilot.
              </span>
            </h1>
            <p className="text-white/50 text-lg font-medium leading-relaxed max-w-md">
              AutoApply scrapes jobs, finds decision-makers, and sends hyper-personalized cold emails — while you focus on prep.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#FF5B2E]" strokeWidth={1.8} />
                </div>
                <span className="text-white/70 text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer quote */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-white/30 text-xs font-medium tracking-wide">
            Built by Jatotech · Powered by OpenAI + Apify
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5] px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px] space-y-10">

          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-gray-900 text-xl font-black">
              Jato<span className="text-[#FF5B2E]">tech</span>
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
              Welcome back.
            </h2>
            <p className="text-gray-500 text-base font-medium">
              Sign in to your AutoApply dashboard.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-gray-100 p-8 space-y-6">

            <div className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-bold text-gray-700 tracking-wide">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="yourname"
                  autoComplete="username"
                  className={`w-full px-4 py-3.5 text-sm font-medium text-gray-900 bg-gray-50 border rounded-xl outline-none transition-all placeholder:text-gray-400
                    ${errors?.username
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                      : 'border-gray-200 focus:border-[#FF5B2E] focus:ring-2 focus:ring-[#FF5B2E]/15'
                    }`}
                  {...register('username', { required: 'Username is required' })}
                />
                {errors?.username && (
                  <p className="text-red-500 text-xs font-semibold mt-1">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 tracking-wide">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3.5 text-sm font-medium text-gray-900 bg-gray-50 border rounded-xl outline-none transition-all placeholder:text-gray-400
                    ${errors?.password
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                      : 'border-gray-200 focus:border-[#FF5B2E] focus:ring-2 focus:ring-[#FF5B2E]/15'
                    }`}
                  {...register('password', { required: 'Password is required' })}
                />
                {errors?.password && (
                  <p className="text-red-500 text-xs font-semibold mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit((data) => mutation.mutate(data))}
              disabled={mutation.isPending}
              className="group w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FF5B2E] to-[#B82E07] hover:from-[#e04b21] hover:to-[#9e2706] text-white py-4 rounded-xl font-bold text-base tracking-wide shadow-lg shadow-[#FF5B2E]/25 hover:shadow-xl hover:shadow-[#FF5B2E]/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <>
                  <SmallSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 font-medium">
            AutoApply by Jatotech · All rights reserved © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
