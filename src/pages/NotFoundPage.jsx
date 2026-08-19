import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const NotFoundPage = () => (
  <main className="min-h-screen flex items-center justify-center bg-neutral p-4">
    <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-dark shadow-sm p-8 text-center">
      <Compass size={32} className="mx-auto mb-4 text-primary-light" aria-hidden="true" />
      <h1 className="font-montserrat font-bold text-2xl text-black-light leading-snug mb-2">
        Page not found
      </h1>
      <p className="font-roboto text-sm text-secondary-dark leading-relaxed mb-6">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center w-full bg-gradient-to-r from-primary-light to-primary-dark text-white font-montserrat font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
      >
        Take me home
      </Link>
    </div>
  </main>
);

export default NotFoundPage;
