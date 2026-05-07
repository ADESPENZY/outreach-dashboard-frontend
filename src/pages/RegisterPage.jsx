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
    <section className="min-h-screen flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full bg-gradient-to-r from-white to-primary-light max-w-5xl relative overflow-hidden py-10 md:pt-20">
        <div className="w-[60%] -mb-10 -ml-5 overflow-hidden flex -rotate-6">
          {/* Image Section */}
          <div className="w-1/2">
            <img
              src="/images/AboutUs2.jpg"
              alt="About Us"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Form Section */}
          <div className="w-1/2 p-10 flex flex-col bg-white rounded-r-2xl justify-center">
            <div className="flex items-center space-x-2 mb-3">
              <Cpu size={28} className="text-primary-light" />
              <h2 className="text-xl font-bold text-black tracking-wide">
                <span className="text-primary-light">Jato</span>tech
              </h2>
            </div>
            <h2 className="font-bold text-black-light mb-3 ">Create your account</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <div>
                <label htmlFor="full_name" className="block text-xs font-medium text-secondary-dark">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  placeholder="John Doe"
                  className="w-full mt-1 py-1 px-2 text-sm rounded-lg border border-secondary-dark/30 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  {...register("full_name", { required: "Full name is required" })}
                />
                {errors?.full_name?.message && (
                  <p className="text-red-600 text-[10px]">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-secondary-dark">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="john@example.com"
                  className="w-full mt-1 py-1 px-2 text-sm rounded-lg border border-secondary-dark/30 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  {...register("email", { 
                    required: "Email is required",
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: "Invalid email address"
                    }
                  })}
                />
                {errors?.email?.message && (
                  <p className="text-red-600 text-[10px]">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-medium text-secondary-dark">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="johndoe"
                  className="w-full mt-1 py-1 px-2 text-sm rounded-lg border border-secondary-dark/30 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  {...register("username", { required: "Username is required" })}
                />
                {errors?.username?.message && (
                  <p className="text-red-600 text-[10px]">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-secondary-dark">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="w-full mt-1 py-1 px-2 text-sm rounded-lg border border-secondary-dark/30 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  {...register("password", { 
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                  })}
                />
                {errors?.password?.message && (
                  <p className="text-red-600 text-[10px]">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-secondary-dark">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="••••••••"
                  className="w-full mt-1 py-1 px-2 text-sm rounded-lg border border-secondary-dark/30 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  {...register("confirmPassword", { 
                    required: "Please confirm your password",
                    validate: value => value === password || "Passwords do not match"
                  })}
                />
                {errors?.confirmPassword?.message && (
                  <p className="text-red-600 text-[10px]">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="bg-primary-light text-white py-1.5 mt-2 rounded-lg font-semibold hover:bg-primary-dark transition duration-300 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
            
            <p className="text-xs text-center mt-3 text-secondary-dark">
              Already have an account?{' '}
              <Link to="/" className="text-primary-dark hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-[40%] h-full px-8 py-20 bg-white flex flex-col justify-center border-l border-neutral-dark">
          <h2 className="text-3xl font-extrabold text-center text-black-light mb-4 leading-tight">
            Automate Your Cold Outreach
          </h2>
          <p className="text-sm text-secondary-dark mb-6">
            Jatotech helps you scale your email campaigns with precision. No more manual follow-ups — reach leads faster and smarter.
          </p>
          <ul className="text-sm text-secondary-dark space-y-2">
            <li>✅ Smart personalization</li>
            <li>✅ Automated follow-ups</li>
            <li>✅ Inbox rotation & warm-up</li>
            <li>✅ Real-time analytics</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
