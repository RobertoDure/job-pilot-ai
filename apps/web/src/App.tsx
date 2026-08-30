import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import JobDetail from './pages/JobDetail';
import CommandCenter from './pages/CommandCenter';
import Insights from './pages/Insights';
import Interview from './pages/Interview';
import Pricing from './pages/Pricing';

// Root layout route: shows the marketing landing page to visitors and the
// authenticated app shell (sidebar + routed page) to signed-in users.
function Home() {
  const { session, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    // Deep links (e.g. /matches) land on the marketing page at "/".
    if (location.pathname !== '/') return <Navigate to="/" replace />;
    return <Landing />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Home />}>
          <Route index element={<Dashboard />} />
          <Route path="matches" element={<Matches />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="insights" element={<Insights />} />
          <Route path="interview/:jobId" element={<Interview />} />
          <Route path="pricing" element={<Pricing />} />
        </Route>
        <Route path="auth" element={<Auth />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}
