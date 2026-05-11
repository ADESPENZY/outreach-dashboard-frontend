import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Rocket } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <section className="flex font-montserrat h-screen overflow-y-hidden">

      {/* ── Mobile top bar (hidden on md+) ──────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-neutral-dark flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-1.5 rounded-xl shadow-lg shadow-primary-light/30">
            <Rocket className="text-white w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight font-montserrat text-black">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Auto</span>Apply
          </h2>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Backdrop (mobile only) ───────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* ── Main content ────────────────────────────────────────────── */}
      <article className="bg-neutral w-full md:w-[80%] overflow-y-auto pt-14 md:pt-0">
        <Header />
        <div className="mt-6 mx-6">
          <Outlet />
        </div>
      </article>

    </section>
  );
};

export default Dashboard;
