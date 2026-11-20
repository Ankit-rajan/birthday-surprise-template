import { Outlet } from 'react-router-dom';
import SiteHeader from '../../components/SiteHeader.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';

/** Shell of every customer page: the logged-in navigation plus the page itself. Private, never indexed. */
export default function DashboardLayout() {
  useDocumentMeta({ title: 'My Dashboard', noindex: true });
  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-dark to-midnight text-ivory">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28">
        <Outlet />
      </main>
    </div>
  );
}

export const PageTitle = ({ title, subtitle, children }) => (
  <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="font-serif text-4xl text-ivory md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-ivory/60">{subtitle}</p>}
    </div>
    {children}
  </header>
);

export const Card = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-gold/20 bg-white/[0.03] p-6 ${className}`}>
    {title && <h2 className="mb-4 font-serif text-2xl text-ivory">{title}</h2>}
    {children}
  </section>
);
