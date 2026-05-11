import { useMutation } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm();
  const { errors } = formState;
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: () => {
      toast.success("You Have Successfully Signed In!!");
      setTimeout(() => {
        const from = location?.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }, 100);
    },
    onError: (err) => {
      toast.error(err.message || 'Login failed');
    }
  });

  function onSubmit(data) {
    mutation.mutate(data);
  }

  return (
    <section className="min-h-screen flex justify-center items-center bg-gray-50 p-4 sm:p-8">
      {/* Outer Card Container */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden border border-neutral-dark relative">
        
        {/* ── LEFT SIDE: Form Section (Always visible) ── */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white z-10">
          <div className="flex items-center space-x-2 mb-8">
            <Cpu size={32} className="text-primary-light" />
            <h2 className="text-2xl font-bold text-black tracking-wide font-montserrat">
              <span className="text-primary-light">Jato</span>tech
            </h2>
          </div>
          
          <h2 className="text-xl font-bold text-black-light mb-6 font-montserrat">
            Nice to see you again
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                placeholder="Your Username"
                className="w-full py-2.5 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                {...register("username", { required: "Username is required" })}
              />
              {errors?.username?.message && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                className="w-full py-2.5 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all font-mono"
                {...register("password", { required: "Password is required" })}
              />
              {errors?.password?.message && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-2 w-full bg-gradient-to-r from-primary-dark to-primary-light text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {mutation.isPending ? (
                <>
                  <SmallSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
          
          <p className="text-sm text-center mt-8 text-secondary-dark">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-dark hover:underline font-bold transition-all">
              Sign up
            </Link>
          </p>
        </div>

        {/* ── RIGHT SIDE: Features & Image (Hidden on mobile) ── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-50 to-primary-light/10 border-l border-neutral-dark relative overflow-hidden">
          
          {/* Text Content */}
          <div className="p-12 z-10">
            <h2 className="text-3xl font-extrabold text-black mb-4 leading-tight font-montserrat">
              Automate Your Cold Outreach
            </h2>
            <p className="text-sm text-secondary-dark mb-8 leading-relaxed">
              Jatotech helps you scale your email campaigns with precision. No more manual follow-ups — reach leads faster and smarter.
            </p>
            <ul className="text-sm text-black-light font-medium space-y-4">
              <li className="flex items-center gap-3"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-light/20 text-primary-dark text-xs">✓</span> Smart personalization</li>
              <li className="flex items-center gap-3"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-light/20 text-primary-dark text-xs">✓</span> Automated follow-ups</li>
              <li className="flex items-center gap-3"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-light/20 text-primary-dark text-xs">✓</span> Inbox rotation & warm-up</li>
              <li className="flex items-center gap-3"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-light/20 text-primary-dark text-xs">✓</span> Real-time analytics</li>
            </ul>
          </div>

          {/* Image tucked cleanly at the bottom */}
          <div className="relative h-64 w-full mt-auto">
            {/* Gradient overlay to fade the image nicely into the background */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-slate-50/90 z-10" />
            <img
              src="/images/AboutUs2.jpg"
              alt="About Us"
              className="w-full h-full object-cover object-top opacity-80 mix-blend-multiply"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default LoginPage;