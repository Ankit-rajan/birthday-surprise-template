import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthContext.jsx';
import { RequireCustomer, GuestOnly, Loading } from './components/RouteGuards.jsx';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/AuthPages.jsx';

// Everything heavy or role-specific is loaded on demand, so the landing page stays fast.
const Demo = lazy(() => import('./pages/Demo.jsx'));
const PublicBirthday = lazy(() => import('./pages/PublicBirthday.jsx'));
const PlatformApp = lazy(() => import('./pages/platform/PlatformApp.jsx'));
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.jsx'));
const Overview = lazy(() => import('./pages/dashboard/Overview.jsx'));
const Website = lazy(() => import('./pages/dashboard/Website.jsx'));
const Customize = lazy(() => import('./pages/dashboard/Customize.jsx'));
const Features = lazy(() => import('./pages/dashboard/Features.jsx'));
const Account = lazy(() => import('./pages/dashboard/Account.jsx'));
const Preview = lazy(() => import('./pages/dashboard/Preview.jsx'));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/birthday/:slug" element={<PublicBirthday />} />

          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Customers only */}
          <Route path="/dashboard" element={<RequireCustomer><DashboardLayout /></RequireCustomer>}>
            <Route index element={<Overview />} />
            <Route path="website" element={<Website />} />
            <Route path="customize" element={<Customize />} />
            <Route path="features" element={<Features />} />
            <Route path="relationship" element={<Navigate to="/dashboard/customize?tab=relationship" replace />} />
            <Route path="appearance" element={<Navigate to="/dashboard/customize?tab=appearance" replace />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="/dashboard/preview" element={<RequireCustomer><Preview /></RequireCustomer>} />

          {/* Platform owner only: its own login, session and API */}
          <Route path="/platform/*" element={<PlatformApp />} />
          <Route path="/admin/*" element={<Navigate to="/platform" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
