import { useMutation } from '@tanstack/react-query';
import { Zap, ArrowRight, Shield, Sparkles, TrendingUp, Mail, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { login } from '../services/apiBlog';

const FEATURES = [
  { icon: Sparkles,    label: 'AI cold emails in seconds',          color: 'from-violet-500 to-purple-600' },
  { icon: TrendingUp,  label: 'Auto job scraping from LinkedIn',    color: 'from-blue-500 to-cyan-500' },
  { icon: Mail,        label: 'Inbox warm-up & smart rotation',     color: 'from-emerald-500 to-teal-500' },
  { icon: Shield,      label: 'Encrypted and always in control',    color: 'from-[#FF5B2E] to-[#B82E07]' },
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
    <div className="min-h-screen flex font-montserrat bg-[#0F0F0F] overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT — Tilted login card + layered depth cards
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:w-[52%] flex items-center justify-center relative px-8 py-16">

        {/* Background glows */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#FF5B2E] opacity-[0.08] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-violet-600 opacity-[0.07] blur-[90px] pointer-events-none" />

        {/* Stacked depth cards behind the main card */}
        <div className="relative w-full max-w-[400px]">

          {/* Depth card — far back, most rotated, orange */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] rotate-[8deg] scale-[0.97] opacity-60 shadow-2xl shadow-[#FF5B2E]/40" />

          {/* Depth card — middle, violet */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 rotate-[4deg] scale-[0.99] opacity-50 shadow-xl shadow-violet-900/40" />

          {/* ── MAIN FORM CARD — slightly tilted ────────────────────── */}
          <div className="relative bg-white rounded-3xl shadow-2xl shadow-black/40 -rotate-[1.5deg] overflow-hidden">

            {/* Card top colour strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FF5B2E] via-[#FFB347] to-[#B82E07]" />

            <div className="px-9 py-10 space-y-7">

              {/* Brand */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] flex items-center justify-center shadow-md shadow-[#FF5B2E]/40">
                  <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-gray-900 text-lg font-black tracking-tight">
                  Jato<span className="text-[#FF5B2E]">tech</span>
                </span>
              </div>

              {/* Heading */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
                  Nice to see<br />you again.
                </h2>
                <p className="text-gray-400 text-sm font-semibold mt-1.5">
                  Sign in to your AutoApply dashboard
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-xs font-bold text-gray-600 uppercase tracking-widest">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="yourname"
                    autoComplete="username"
                    className={`w-full px-4 py-3.5 text-sm font-semibold text-gray-900 bg-gray-50 border-2 rounded-xl outline-none transition-all placeholder:text-gray-300 placeholder:font-normal
                      ${errors?.username
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                        : 'border-gray-100 focus:border-[#FF5B2E] focus:bg-white focus:ring-4 focus:ring-[#FF5B2E]/10'
                      }`}
                    {...register('username', { required: 'Username is required' })}
                  />
                  {errors?.username && (
                    <p className="text-red-500 text-xs font-bold">{errors.username.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-bold text-gray-600 uppercase tracking-widest">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    className={`w-full px-4 py-3.5 text-sm font-semibold text-gray-900 bg-gray-50 border-2 rounded-xl outline-none transition-all placeholder:text-gray-300 placeholder:font-normal
                      ${errors?.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                        : 'border-gray-100 focus:border-[#FF5B2E] focus:bg-white focus:ring-4 focus:ring-[#FF5B2E]/10'
                      }`}
                    {...register('password', { required: 'Password is required' })}
                  />
                  {errors?.password && (
                    <p className="text-red-500 text-xs font-bold">{errors.password.message}</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit((data) => mutation.mutate(data))}
                disabled={mutation.isPending}
                className="group w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FF5B2E] to-[#B82E07] hover:from-[#e04b21] hover:to-[#9e2706] text-white py-4 rounded-xl font-black text-sm tracking-widest uppercase shadow-xl shadow-[#FF5B2E]/30 hover:shadow-2xl hover:shadow-[#FF5B2E]/40 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <>
                    <SmallSpinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>

              {/* Divider line */}
              <p className="text-center text-[11px] text-gray-300 font-semibold tracking-wide">
                AutoApply · Jatotech © 2026
              </p>
            </div>
          </div>

          {/* Floating accent badge — top right of card cluster */}
          <div className="absolute -top-5 -right-5 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/40 rotate-[6deg] flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> AI Powered
          </div>

          {/* Floating accent badge — bottom left */}
          <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-violet-500/40 -rotate-[4deg]">
            Outreach OS
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT — Marketing copy
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-center px-16 xl:px-20 py-16 relative border-l border-white/5">

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative z-10 space-y-12 max-w-lg">

          {/* Pill */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-[#FF5B2E] animate-pulse" />
            <span className="text-white/50 text-xs font-bold uppercase tracking-[0.15em]">Outreach Automation</span>
          </div>

          {/* Headline */}
          <div className="space-y-5">
            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[1.0] tracking-tight">
              Land<br />
              interviews<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5B2E] to-[#FFB347]">
                on autopilot.
              </span>
            </h1>
            <p className="text-white/45 text-lg font-semibold leading-relaxed">
              AutoApply scrapes jobs, finds real decision-makers, and sends hyper-personalized cold emails — while you focus on landing the role.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-5 py-4 hover:bg-white/[0.07] transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-md`}>
                  <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <span className="text-white/75 text-sm font-bold">{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom footnote */}
          <p className="text-white/20 text-xs font-semibold tracking-wide">
            Built by Jatotech · Powered by OpenAI + Apify + LinkedIn
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
