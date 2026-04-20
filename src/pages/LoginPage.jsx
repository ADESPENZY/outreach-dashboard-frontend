import { useMutation } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SmallSpinner from '../components/SmallSpinner';
import { login } from '../services/apiBlog';

const LoginPage = () => {
  const { register, handleSubmit, formState } =useForm();
  const { errors } = formState;
  const location = useLocation();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: (response) => {

      if (!response.access || !response.refresh) {
        toast.error('Invalid response from server');
        return;
      }
      localStorage.setItem("access", response.access);
      localStorage.setItem("refresh", response.refresh);
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
    <section className="min-h-screen flex justify-center items-center ">
      <div className="bg-white rounded-2xl shadow-2xl w-full bg-gradient-to-r  from-white to-primary-light max-w-5xl relative overflow-hidden pt-20 ">
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
            <div className="flex items-center space-x-2 mb-5">
              <Cpu size={28} className="text-primary-light" />
              <h2 className="text-xl font-bold text-black tracking-wide">
                <span className="text-primary-light">Jato</span>tech
              </h2>
            </div>
            <h2 className="font-bold text-gray-800 mb-3 ">Nice to see you again</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Your Username"
                  className="w-full mt-2 py-1 px-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#FF5B2E]"
                  {...register("username", { required: "Username is required" })}
                />
                {errors?.username?.message && (
                  <p className="text-red-600 text-sm">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="w-full mt-2 py-1 px-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#FF5B2E]"
                  {...register("password", { required: "Password is required" })}
                />
                {errors?.password?.message && (
                  <p className="text-red-600 text-sm">{errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#FF5B2E] text-white py-1 rounded-lg font-semibold hover:bg-[#e04b21] transition duration-300 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

          </div>
        </div>
        <div className="absolute top-0 right-0 w-[40%] h-full px-8 py-20 bg-white flex flex-col justify-center border-l border-gray-100">
          <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-4 leading-tight">
            Automate Your Cold Outreach
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Jatotech helps you scale your email campaigns with precision. No more manual follow-ups — reach leads faster and smarter.
          </p>
          <ul className="text-sm text-gray-700 space-y-2">
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

export default LoginPage;
