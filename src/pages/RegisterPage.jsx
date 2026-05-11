import { useMutation } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register, handleSubmit, formState, watch } = useForm();
  const { errors } = formState;
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();

  const password = watch('password');

  const mutation = useMutation({
    mutationFn: (data) => authRegister(data),
    onSuccess: () => {
      toast.success("Account created successfully!");
      navigate('/onboarding', { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed');
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
          <div className="flex items-center space-x-2 mb-6">
            <Cpu size={32} className="text-primary-light" />
            <h2 className="text-2xl font-bold text-black tracking-wide font-montserrat">
              <span className="text-primary-light">Jato</span>tech
            </h2>
          </div>
          
          <h2 className="text-xl font-bold text-black-light mb-6 font-montserrat">
            Create your account
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="full_name" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                placeholder="John Doe"
                className="w-full py-2 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                {...register("full_name", { required: "Full name is required" })}
              />
              {errors?.full_name?.message && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="john@example.com"
                className="w-full py-2 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email address"
                  }
                })}
              />
              {errors?.email?.message && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                placeholder="johndoe"
                className="w-full py-2 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                {...register("username", { required: "Username is required" })}
              />
              {errors?.username?.message && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{errors.username.message}</p>
              )}
            </div>

            {/* Password Row (Stacks on very small screens, side-by-side on larger) */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all font-mono"
                  {...register("password", { 
                    required: "Password is required",
                    minLength: { value: 6, message: "Must be at least 6 characters" }
                  })}
                />
                {errors?.password?.message && (
                  <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <div className="w-full sm:w-1/2">
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="••••••••"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-neutral-dark focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all font-mono"
                  {...register("confirmPassword", { 
                    required: "Please confirm your password",
                    validate: value => value === password || "Passwords do not match"
                  })}
                />
                {errors?.confirmPassword?.message && (
                  <p className="text-red-500 text-xs font-medium mt-1.5">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-4 w-full bg-gradient-to-r from-primary-dark to-primary-light text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {mutation.isPending ? (
                <>
                  <SmallSpinner />
                  <span>Signing up...</span>
                </>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </form>
          
          <p className="text-sm text-center mt-6 text-secondary-dark">
            Already have an account?{' '}
            <Link to="/" className="text-primary-dark hover:underline font-bold transition-all">
              Sign in
            </Link>
          </p>
        </div>

        {/* ── RIGHT SIDE: Features & Image (Hidden on mobile) ── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-50 to-primary-light/10 border-l border-neutral-dark relative overflow-hidden">
          
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

          <div className="relative h-64 w-full mt-auto">
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

export default RegisterPage;