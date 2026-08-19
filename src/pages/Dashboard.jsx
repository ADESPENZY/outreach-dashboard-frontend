import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import UsernamePickerModal from '../components/UsernamePickerModal';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, checkAuth } = useAuth();

  return (
    <div className="flex h-screen w-full bg-neutral/20 overflow-hidden font-montserrat">

      {/* Re-prompt Google users who never picked a real username (they're still
          on the auto-assigned email prefix). Refresh auth so it clears once set. */}
      {currentUser?.needs_username && <UsernamePickerModal onDone={checkAuth} />}

      {/* ── Backdrop (mobile only) ───────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 w-full flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 relative">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <Outlet />
      </main>

    </div>
  );
};

export default Dashboard;
