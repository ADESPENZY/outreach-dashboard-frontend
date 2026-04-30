import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SmallSpinner from "./SmallSpinner";
import SmallSpinnerText from "./SmallSpinnerText";
import { Trash2, User } from "lucide-react";
import { createGmailAccount, deleteGmailAccount, getGmailAccounts } from "@/services/apiGmail";
import { useState } from "react";


const ConnectedAccounts = () => {
  const { register, handleSubmit, formState, reset } = useForm();
  const { errors } = formState;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

 const { data, isLoading, isError, error } = useQuery({
  queryKey: ["gmailAccounts"],
  queryFn: getGmailAccounts,
});

const accounts = data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: (data) => createGmailAccount(data),
    onSuccess: () => {
      toast.success("Gmail account added successfully!");
      queryClient.invalidateQueries({ queryKey: ["gmailAccounts"] });
      reset();
    },
    onError: (err) => {
      if (err?.response?.data?.error) {
        toast.error(err.response.data.error); // backend error message (like "Invalid Gmail app password")
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },

  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteGmailAccount(id),
    onSuccess: () => {
      toast.success("Gmail account deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["gmailAccounts"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data) => {
    createMutation.mutate(data);
  };

  if (isLoading) return <SmallSpinnerText text="Loading accounts..." />;
  if (isError) return <p className="text-red-500 text-center">Error: {error.message}</p>;

  return (
    <div className="md:px-16 px-8 py-10 flex flex-col mx-auto my-12 items-center gap-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D2E] dark:text-gray-100 transition-all duration-300">
      <h3 className="text-3xl font-extrabold text-[#1E1E2F] dark:text-[#E0E0E6] mb-8 tracking-tight">Manage Connected Accounts</h3>
      
      {/* Add New Account Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6 bg-gray-50 p-6 rounded-xl shadow-md dark:bg-[#252836]">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Gmail Address
          </Label>
          <Input
            type="email"
            id="email"
            {...register("email", { required: "Email is required" })}
            placeholder="Enter Gmail address"
            className="border-2 border-gray-300 dark:border-gray-600 focus:border-primary-light focus:ring-2 focus:ring-primary-light/50 h-12 w-full text-base rounded-lg transition-all duration-200"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="app_password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            App Password
          </Label>
          <div className="flex items-center relative">
            <Input
              type={showPassword ? "text" : "password"}
              id="app_password"
              {...register("app_password", { 
                required: "App password is required",
                minLength: { value: 16, message: "Must be 16 characters" }
              })}
              placeholder="Enter 16-character app password"
              className="border-2 border-gray-300 focus:border-primary-light focus:ring-2 focus:ring-primary-light/50 h-12 w-full rounded-lg pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-3 text-gray-600 dark:text-gray-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.app_password && <p className="text-red-500 text-sm mt-1">{errors.app_password.message}</p>}
        </div>

        <div>
          <Label htmlFor="daily_send_limit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Daily Send Limit
          </Label>
          <Input
            type="number"
            id="daily_send_limit"
            {...register("daily_send_limit", { 
              required: "Daily limit is required",
              min: { value: 1, message: "Must be at least 1" }
            })}
            placeholder="Enter daily send limit"
            className="border-2 border-gray-300 dark:border-gray-600 focus:border-primary-light focus:ring-2 focus:ring-primary-light/50 h-12 w-full text-base rounded-lg transition-all duration-200"
          />
          {errors.daily_send_limit && <p className="text-red-500 text-sm mt-1">{errors.daily_send_limit.message}</p>}
        </div>

        <button
          disabled={createMutation.isPending}
          className="w-full py-3 px-6 bg-primary-light text-white rounded-xl flex items-center justify-center gap-3 hover:from-[#3A55D1] hover:to-[#2A3F9F] transition-all duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <>
              <SmallSpinner /> <SmallSpinnerText text="Adding Account..." />
            </>
          ) : (
            <SmallSpinnerText text="Add Account" />
          )}
        </button>
      </form>

      {/* Accounts List */}
      <div className="mt-10 w-full">
        <h4 className="text-xl font-semibold text-[#1E1E2F] dark:text-[#E0E0E6] mb-6">Connected Accounts</h4>
        {accounts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-lg py-6">No accounts connected.</p>
        ) : (
          <ul className="space-y-5">
            {confirmDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-[#1A1D2E] p-6 rounded-xl shadow-lg max-w-sm w-full">
                  <h4 className="text-xl font-semibold mb-4 text-center">Confirm Deletion</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
                    Are you sure you want to delete <strong>{confirmDelete.email}</strong>?
                  </p>
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteMutation.mutate(confirmDelete.id);
                        setConfirmDelete(null);
                      }}
                      className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#252836] rounded-xl shadow-md hover:bg-gray-100 dark:hover:bg-[#2A2D3D] transition-all duration-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary mr-5">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{account.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`w-3 h-3 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {account.is_active ? 'Live' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(account)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConnectedAccounts;