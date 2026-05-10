import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import SmallSpinnerText from "./SmallSpinnerText";
import { Trash2, User, Plus, Shield, Zap } from "lucide-react";
import { createGmailAccount, deleteGmailAccount, getGmailAccounts } from "@/services/apiGmail";
import { useState } from "react";
import OnboardingModal from "./OnboardingModal";

const ConnectedAccounts = () => {
  const queryClient  = useQueryClient();
  const [showModal, setShowModal]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gmailAccounts"],
    queryFn: getGmailAccounts,
  });

  const accounts = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteGmailAccount(id),
    onSuccess: () => {
      toast.success("Account removed.");
      queryClient.invalidateQueries({ queryKey: ["gmailAccounts"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConnect = async (formData) => {
    await createGmailAccount(formData);
    queryClient.invalidateQueries({ queryKey: ["gmailAccounts"] });
    setShowModal(false);
    toast.success("Account connected! Your outreach engine is ready.");
  };

  if (isLoading) return <SmallSpinnerText text="Loading accounts..." />;
  if (isError)   return <p className="text-red-500 text-center">Error: {error.message}</p>;

  return (
    <>
      {showModal && (
        <OnboardingModal
          onClose={() => setShowModal(false)}
          onComplete={handleConnect}
        />
      )}

      <div className="md:px-16 px-8 py-10 flex flex-col mx-auto my-12 items-center gap-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D2E] dark:text-gray-100 transition-all duration-300">
        <div className="w-full flex items-center justify-between">
          <h3 className="text-3xl font-extrabold text-[#1E1E2F] dark:text-[#E0E0E6] tracking-tight">
            Connected Accounts
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Connect Gmail
          </button>
        </div>

        {/* Empty state */}
        {accounts.length === 0 && (
          <div className="w-full flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-light/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary-light" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No accounts connected yet.</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Connect your Gmail to start sending cold outreach directly from your own address.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Connect your first Gmail
            </button>
          </div>
        )}

        {/* Accounts list */}
        {accounts.length > 0 && (
          <ul className="w-full space-y-4">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#252836] rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-[#2A2D3D] transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary-light/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{account.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {account.is_active ? 'Active' : 'Paused'}
                      </span>
                      {account.warmup_enabled && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <Shield className="w-3 h-3" /> Warmup on
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {account.sent_today ?? 0} sent today
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmDelete(account)}
                  className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1A1D2E] p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Remove account?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This will disconnect <strong>{confirmDelete.email}</strong> from OutreachOS.
              You can reconnect it at any time.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConnectedAccounts;
