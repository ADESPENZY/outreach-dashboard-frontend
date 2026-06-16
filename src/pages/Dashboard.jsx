import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-neutral/20 overflow-hidden font-montserrat">

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
