import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Rocket, Eye, EyeOff, FileText, Mail, Settings,
  Briefcase, TrendingUp, Zap
} from 'lucide-react';
import {
  motion, AnimatePresence, useAnimationFrame, useMotionValue,
  animate
} from 'framer-motion';
import SmallSpinner from '../components/SmallSpinner';
import { useAuth } from '../context/AuthContext';

/* ─── ACTIVITY LOG DATA ─── */
const LOGS = [
  { id: 1, text: 'Scraped opportunity (Microsoft) — AI scored 95', time: '2s ago' },
  { id: 2, text: 'Tailored CV generated for Nvidia application', time: '14s ago' },
  { id: 3, text: 'Warmup email session completed — inbox score +12', time: '1m ago' },
];

/* ─── METRIC CARDS ─── */
const METRICS = [
  { label: 'AVG AI MATCH SCORE', value: 25, suffix: ' pts', prefix: '+', color: 'orange' },
  { label: 'COLD EMAIL OPEN RATE', value: 68, suffix: '%', prefix: '', color: 'teal' },
  { label: 'PLATFORM UPTIME', value: 99.9, suffix: '%', prefix: '', color: 'white' },
];

/* ─── ANIMATED COUNT-UP ─── */
function CountUp({ target, suffix, prefix }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Number.isInteger(target) ? Math.round(v) : parseFloat(v.toFixed(1))),
    });
    return controls.stop;
  }, [target]);
  return <span>{prefix}{display}{suffix}</span>;
}

/* ─── FLOATING LABEL INPUT ─── */
function FloatingInput({ id, label, type = 'text', register, error, rightSlot }) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const floated = focused || hasValue;
  return (
    <div className="relative">
      <div className={`relative rounded-lg border transition-all duration-200 ${
        focused
          ? 'border-[rgba(255,91,46,0.60)] shadow-[0_0_0_3px_rgba(184,46,7,0.15)]'
          : 'border-[rgba(255,255,255,0.10)]'
      } bg-[#000000]`}>
        <label
          htmlFor={id}
          className={`absolute left-3 transition-all duration-200 pointer-events-none font-roboto ${
            floated
              ? 'top-1.5 text-[10px] text-[rgba(255,91,46,0.80)]'
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

/* ─── BRAIN NODE ─── */
function BrainNode({ x, y, delay }) {
  return (
    <motion.circle
      cx={x} cy={y} r={3}
      fill="rgba(255,91,46,0.70)"
      animate={{ opacity: [0.35, 1, 0.35] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

/* ─── ROTATING RING ─── */
function RotatingRing({ r, strokeDash, duration, reverse }) {
  return (
    <motion.circle
      cx={60} cy={60} r={r}
      fill="none"
      stroke={r > 45 ? 'rgba(184,46,7,0.18)' : 'rgba(255,91,46,0.28)'}
      strokeWidth={1}
      strokeDasharray={strokeDash || 'none'}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '60px 60px' }}
    />
  );
}

/* ─── ANIMATED DOT ALONG SVG PATH ─── */
function TravelingDot({ pathRef, duration, color = '#FF5B2E', delay = 0 }) {
  const progress = useMotionValue(0);
  const circleRef = useRef(null);

  useAnimationFrame((t) => {
    if (!pathRef.current || !circleRef.current) return;
    const total = pathRef.current.getTotalLength();
    const p = ((t / 1000 / duration) % 1);
    const point = pathRef.current.getPointAtLength(p * total);
    circleRef.current.setAttribute('cx', point.x);
    circleRef.current.setAttribute('cy', point.y);
    progress.set(p);
  });

  return (
    <circle
      ref={circleRef}
      r={4}
      fill={color}
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    />
  );
}

/* ─── PIPELINE SVG CONNECTOR ─── */
function PipelineSVG() {
  const path1Ref = useRef(null);
  const path2Ref = useRef(null);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(184,46,7,0.40)" />
          <stop offset="100%" stopColor="rgba(255,91,46,0.40)" />
        </linearGradient>
      </defs>
      {/* Zone 1 → Zone 2 */}
      <path
        ref={path1Ref}
        d="M 148 90 C 180 90 195 90 215 90"
        stroke="url(#lineGrad)" strokeWidth="1.5"
        fill="none" strokeDasharray="4 3"
      />
      {/* Zone 2 → Zone 3 */}
      <path
        ref={path2Ref}
        d="M 305 90 C 325 90 340 90 360 70"
        stroke="url(#lineGrad)" strokeWidth="1.5"
        fill="none" strokeDasharray="4 3"
      />
      <TravelingDot pathRef={path1Ref} duration={3} delay={0} />
      <TravelingDot pathRef={path2Ref} duration={3} delay={1.5} color="#0A9396" />
    </svg>
  );
}

/* ─── JOB CARD (ZONE 1) ─── */
function JobCard({ title, company, score, offsetY, zIndex, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="absolute left-0 rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-2 w-36"
      style={{ top: offsetY, zIndex }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded bg-[rgba(255,255,255,0.05)] flex-shrink-0" />
        <div>
          <p className="text-white text-[10px] font-roboto font-medium leading-tight truncate">{title}</p>
          <p className="text-[rgba(255,255,255,0.40)] text-[9px] font-roboto">{company}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <span className="text-[#0A9396] text-[9px] font-roboto bg-[rgba(10,147,150,0.12)] px-1.5 py-0.5 rounded-full">
          {score}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── AI ENGINE (ZONE 2) ─── */
function AIEngine() {
  const nodes = [
    { x: 60, y: 28, delay: 0 }, { x: 38, y: 48, delay: 0.3 }, { x: 82, y: 48, delay: 0.6 },
    { x: 28, y: 70, delay: 0.9 }, { x: 60, y: 75, delay: 0.2 }, { x: 92, y: 70, delay: 0.7 },
    { x: 44, y: 88, delay: 0.4 }, { x: 76, y: 88, delay: 1.0 },
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7],
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, rgba(184,46,7,0.25) 0%, transparent 70%)' }}
        />
        <svg width="120" height="120" viewBox="0 0 120 120">
          <RotatingRing r={52} strokeDash="3 4" duration={12} />
          <RotatingRing r={44} duration={18} reverse />
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a].x} y1={nodes[a].y}
              x2={nodes[b].x} y2={nodes[b].y}
              stroke="rgba(255,91,46,0.20)" strokeWidth={0.8}
            />
          ))}
          {nodes.map((n, i) => <BrainNode key={i} {...n} />)}
          {/* Gear icons as SVG text stand-ins */}
          <motion.g
            style={{ transformOrigin: '18px 18px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx="18" cy="18" r="7" fill="none" stroke="rgba(255,91,46,0.45)" strokeWidth="1" />
            <circle cx="18" cy="18" r="3" fill="rgba(255,91,46,0.45)" />
          </motion.g>
          <motion.g
            style={{ transformOrigin: '102px 102px' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx="102" cy="102" r="7" fill="none" stroke="rgba(255,91,46,0.45)" strokeWidth="1" />
            <circle cx="102" cy="102" r="3" fill="rgba(255,91,46,0.45)" />
          </motion.g>
        </svg>
      </div>
      <p className="text-[rgba(255,255,255,0.40)] text-[9px] font-montserrat font-semibold tracking-widest uppercase text-center leading-tight">
        AI Scoring &<br />Tailoring Engine
      </p>
    </div>
  );
}

/* ─── OUTPUT CARDS (ZONE 3) ─── */
function OutputCards() {
  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-2.5 w-40"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <FileText size={11} className="text-[rgba(255,255,255,0.60)]" />
          <p className="text-white text-[10px] font-roboto font-medium">Tailored CV</p>
        </div>
        <div className="space-y-1 mb-2">
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] w-full" />
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] w-4/5" />
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] w-3/5" />
        </div>
        <div className="flex justify-end">
          <span className="text-[9px] font-roboto bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent font-semibold">
            AI Match: 95%
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-2.5 w-40"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Mail size={11} className="text-[rgba(255,255,255,0.60)]" />
          <p className="text-white text-[10px] font-roboto font-medium">Email Draft</p>
        </div>
        <div className="space-y-1 mb-2">
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] w-full" />
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] w-2/3" />
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#0A9396]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[#0A9396] text-[9px] font-roboto tracking-wider uppercase">Ready to Send</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex flex-col items-center gap-1"
      >
        <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] flex items-center justify-center">
          <Briefcase size={12} className="text-[rgba(255,255,255,0.40)]" />
        </div>
        <p className="text-[rgba(255,255,255,0.25)] text-[8px] font-roboto">Hiring Manager</p>
      </motion.div>
    </div>
  );
}

/* ─── ACTIVITY LOG ─── */
function ActivityLog() {
  return (
    <div
      className="rounded-xl border border-[rgba(255,255,255,0.07)] p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-[#0A9396] flex-shrink-0"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="text-[rgba(255,255,255,0.35)] text-[9px] font-montserrat font-semibold tracking-widest uppercase">
          Recent Activity
        </p>
      </div>
      <div className="space-y-2">
        {LOGS.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
            className="flex items-start justify-between gap-2"
          >
            <div className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0A9396] flex-shrink-0 mt-[3px]" />
              <p className="text-[rgba(255,255,255,0.65)] text-[10px] font-roboto leading-tight">{log.text}</p>
            </div>
            <span className="text-[rgba(255,255,255,0.25)] text-[9px] font-roboto flex-shrink-0">{log.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── METRIC CARD ─── */
function MetricCard({ label, value, suffix, prefix, color, delay }) {
  const valueColor =
    color === 'orange'
      ? 'bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent'
      : color === 'teal'
      ? 'text-[#0A9396]'
      : 'text-white';

  const subLabels = {
    'AVG AI MATCH SCORE': 'above baseline',
    'COLD EMAIL OPEN RATE': 'industry avg: 21%',
    'PLATFORM UPTIME': 'last 30 days',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="flex-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#000000] p-3 flex flex-col gap-0.5"
    >
      <p className="text-[rgba(255,255,255,0.35)] text-[8px] font-roboto font-medium tracking-widest uppercase leading-tight">
        {label}
      </p>
      <p className={`text-lg font-montserrat font-extrabold leading-none ${valueColor}`}>
        <CountUp target={value} suffix={suffix} prefix={prefix} />
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        {color === 'teal' && (
          <TrendingUp size={9} className="text-[rgba(10,147,150,0.60)]" />
        )}
        <p className="text-[rgba(255,255,255,0.28)] text-[8px] font-roboto">{subLabels[label]}</p>
      </div>
    </motion.div>
  );
}

/* ─── VISUALIZATION PANEL ─── */
function VisualizationPanel() {
  return (
    <div className="h-full flex flex-col justify-between p-6 lg:p-8 gap-5 relative overflow-hidden">
      {/* Background circuit grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Zone label row */}
      <div>
        <div className="flex items-center gap-1.5 mb-4">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#0A9396]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p className="text-[rgba(255,255,255,0.35)] text-[9px] font-montserrat font-semibold tracking-widest uppercase">
            Live Pipeline
          </p>
        </div>

        {/* Three zones */}
        <div className="relative flex items-start justify-between gap-2">
          {/* Zone 1 */}
          <div className="flex flex-col items-start gap-2 flex-shrink-0">
            <p className="text-[rgba(255,255,255,0.30)] text-[8px] font-montserrat font-semibold tracking-widest uppercase">
              Source
            </p>
            <div className="relative h-36 w-36">
              <JobCard title="Sr. Engineer" company="Microsoft" score="95" offsetY={0} zIndex={3} delay={0.2} />
              <JobCard title="ML Researcher" company="Nvidia" score="91" offsetY={20} zIndex={2} delay={0.35} />
              <JobCard title="Product Lead" company="Google" score="88" offsetY={38} zIndex={1} delay={0.5} />
            </div>
          </div>

          {/* Zone 2 */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <p className="text-[rgba(255,255,255,0.30)] text-[8px] font-montserrat font-semibold tracking-widest uppercase">
              Engine
            </p>
            <AIEngine />
          </div>

          {/* Zone 3 */}
          <div className="flex flex-col items-start gap-2 flex-shrink-0">
            <p className="text-[rgba(255,255,255,0.30)] text-[8px] font-montserrat font-semibold tracking-widest uppercase">
              Output
            </p>
            <OutputCards />
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <ActivityLog />

      {/* Metrics */}
      <div className="flex gap-2">
        {METRICS.map((m, i) => (
          <MetricCard key={m.label} {...m} delay={0.5 + i * 0.1} />
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN LOGIN PAGE ─── */
const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm();
  const { errors } = formState;
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: () => {
      toast.success('You Have Successfully Signed In!!');
      setTimeout(() => {
        const from = location?.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 100);
    },
    onError: (err) => {
      toast.error(err.message || 'Login failed');
    },
  });

  return (
    <section className="min-h-screen flex bg-[#1A1A1A]">
      {/* ── LEFT: Auth Panel ── */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-12 relative z-10">
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
            style={{ color: '#FF5B2E', filter: 'drop-shadow(0 0 6px rgba(255,91,46,0.50))' }}
          />
          <span className="font-montserrat font-semibold text-white text-lg">
            Apply
            <span
              className="font-extrabold bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent"
            >
              DIR
            </span>
          </span>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex-1 flex flex-col justify-center max-w-sm"
        >
          <div className="flex items-start gap-3 mb-8">
            <div
              className="w-0.5 h-8 rounded-full flex-shrink-0 mt-1"
              style={{ background: 'linear-gradient(to bottom, #B82E07, #FF5B2E)' }}
            />
            <div>
              <p className="text-[rgba(255,255,255,0.45)] font-montserrat text-sm mb-1">
                Welcome back,
              </p>
              <h1 className="text-white font-montserrat font-bold text-2xl leading-tight">
                Sign in to your command center.
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-5">
            <FloatingInput
              id="username"
              label="Username"
              register={register('username', { required: 'Username is required' })}
              error={errors?.username?.message}
            />
            <FloatingInput
              id="password"
              label="Password"
              type={showPass ? 'text' : 'password'}
              register={register('password', { required: 'Password is required' })}
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

            <div className="flex justify-end -mt-2">
              <Link
                to="/forgot-password"
                className="text-[rgba(255,91,46,0.70)] text-xs font-roboto hover:text-[#FF5B2E] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={mutation.isPending}
              whileHover={{ y: -1, boxShadow: '0 0 20px rgba(255,91,46,0.35), 0 0 40px rgba(184,46,7,0.20)' }}
              whileTap={{ y: 0, boxShadow: 'none' }}
              className="w-full h-12 rounded-lg text-white font-montserrat font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
            >
              {mutation.isPending ? (
                <>
                  <SmallSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </form>

          <p className="text-[rgba(255,255,255,0.35)] text-sm font-roboto text-center mt-8">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-[#FF5B2E] hover:text-[#B82E07] font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <p className="text-[rgba(255,255,255,0.20)] text-xs font-roboto text-center">
          © 2025 Jatotech. Enterprise Automation Platform.
        </p>
      </div>

      {/* Divider */}
      <div
        className="hidden md:block w-px self-stretch my-8"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)',
        }}
      />

      {/* ── RIGHT: Visualization Panel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="hidden md:flex md:w-1/2 flex-col"
        style={{
          background: 'radial-gradient(ellipse at center, #1A1A1A 60%, #111111 100%)',
        }}
      >
        <VisualizationPanel />
      </motion.div>
    </section>
  );
};

export default LoginPage;
