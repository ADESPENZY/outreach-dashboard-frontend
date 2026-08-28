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

      {/* ── Backdrop (mobile only) ───────────────────────────────────────
          z-[55] sits deliberately BETWEEN the header (z-50, Header.jsx) and the
          drawer (z-[60], Sidebar.jsx). It used to be z-50 — the same layer as
          the header — which left paint order to be decided by DOM order and
          compositing rather than by intent, so the header (later in the tree,
          and promoted to its own layer by `backdrop-blur-xl`) drew ON TOP of
          the scrim. That is why the header's avatar appeared to float over the
          open drawer and the page showed through undimmed. Any layer added here
          must keep this ordering: header < backdrop < drawer. */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[55]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 w-full flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 relative">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <Outlet />
      </main>

    </div>
  );
};

export default Dashboard;
