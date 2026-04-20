import { useMutation } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { login } from '../services/apiBlog';

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
      toast.success('You Have Successfully Signed In!!');
      setTimeout(() => {
        const from = location?.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 100);
    },
    onError: (err) => toast.error(err.message || 'Login failed'),
  });

  function onSubmit(data) {
    mutation.mutate(data);
  }

  return (
    <section className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-100 to-gray-200 font-montserrat p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl relative overflow-hidden" style={{ minHeight: '600px' }}>

        {/* Background gradient wash inside card */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-[#FF5B2E]/10 pointer-events-none" />

        {/* ── ROTATED CARD (image + form) ───────────────────────────── */}
        <div className="w-[62%] absolute top-0 left-0 bottom-0 overflow-hidden">
          <div className="flex h-full w-[110%] -rotate-6 origin-top-left -ml-4 -mt-8 shadow-2xl rounded-3xl overflow-hidden" style={{ height: 'calc(100% + 80px)' }}>

            {/* Image half */}
            <div className="w-[45%] relative overflow-hidden">
              <img
                src="/images/AboutUs2.jpg"
                alt="About"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Overlay so image doesn't compete */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
            </div>

            {/* Form half */}
            <div className="w-[55%] bg-white flex flex-col justify-center px-10 py-12">

              {/* Brand */}
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] flex items-center justify-center shadow-lg shadow-[#FF5B2E]/30">
                  <Cpu className="w-4.5 h-4.5 text-white" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">
                  <span className="text-[#FF5B2E]">Jato</span>tech
                </h2>
              </div>

              <h2 className="text-3xl font-black text-gray-900 leading-tight mb-1 tracking-tight">
                Nice to see you again
              </h2>
              <p className="text-sm font-semibold text-gray-400 mb-8">Sign in to your dashboard</p>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    placeholder="Your username"
                    className="w-full py-3.5 px-4 text-sm font-semibold text-gray-900 bg-gray-50 rounded-xl border-2 border-gray-100 focus:outline-none focus:border-[#FF5B2E] focus:ring-4 focus:ring-[#FF5B2E]/10 placeholder:text-gray-300 placeholder:font-normal transition-all"
                    {...register('username', { required: 'Username is required' })}
                  />
                  {errors?.username?.message && (
                    <p className="text-red-500 text-xs font-bold mt-1.5">{errors.username.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    className="w-full py-3.5 px-4 text-sm font-semibold text-gray-900 bg-gray-50 rounded-xl border-2 border-gray-100 focus:outline-none focus:border-[#FF5B2E] focus:ring-4 focus:ring-[#FF5B2E]/10 placeholder:text-gray-300 placeholder:font-normal transition-all"
                    {...register('password', { required: 'Password is required' })}
                  />
                  {errors?.password?.message && (
                    <p className="text-red-500 text-xs font-bold mt-1.5">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-gradient-to-r from-[#FF5B2E] to-[#B82E07] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#FF5B2E]/30 hover:shadow-xl hover:shadow-[#FF5B2E]/40 hover:from-[#e04b21] hover:to-[#9e2706] transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {mutation.isPending ? (
                    <><SmallSpinner /><span>Signing in...</span></>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — copy & features ──────────────────────────── */}
        <div className="absolute top-0 right-0 w-[42%] h-full flex flex-col justify-center px-10 py-12">

          <h2 className="text-4xl font-black text-gray-900 leading-tight tracking-tight mb-4">
            Automate Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5B2E] to-[#B82E07]">
              Cold Outreach
            </span>
          </h2>

          <p className="text-sm font-semibold text-gray-500 mb-8 leading-relaxed">
            Jatotech helps you scale your email campaigns with precision. No more manual follow-ups — reach leads faster and smarter.
          </p>

          <ul className="space-y-3.5">
            {[
              'Smart AI personalization',
              'Automated follow-ups',
              'Inbox rotation & warm-up',
              'Real-time analytics',
            ].map(item => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF5B2E] to-[#B82E07] flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5B2E]/30">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-gray-700">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 tracking-wide">
              AutoApply by Jatotech · © 2026
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default LoginPage;
