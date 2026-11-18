import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { VaultProvider } from './hooks/VaultContext.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';

// The admin dashboard is only needed by one person, so keep it out of the main bundle.
const Admin = lazy(() => import('./pages/Admin.jsx'));

export default function App() {
  return (
    <VaultProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="grid min-h-screen place-items-center text-gold">Loading&hellip;</div>}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </VaultProvider>
  );
}
