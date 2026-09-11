import { useEffect, useState } from 'react';
import { api } from '../api';
import KanbanBoard from '../components/KanbanBoard';
import { Spinner } from '../components/ui';
import type { ApplicationStatus, EnrichedApplication } from '../types';

const COMPLETED_STATUSES: ApplicationStatus[] = ['offer', 'rejected', 'no_response'];

export default function CommandCenter() {
  const [apps, setApps] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .applications()
      .then((r) => setApps(r.applications))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load applications'))
      .finally(() => setLoading(false));
  }, []);

  async function move(app: EnrichedApplication, status: ApplicationStatus) {
    if (app.status === status) return;
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await api.updateApplication(app.id, status);
    } catch {
      /* revert on failure */
      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: app.status } : a)));
    }
  }

  if (loading) return <Spinner />;
  if (error) return <div className="text-rose-600">{error}</div>;

  const completed = apps.filter((a) => COMPLETED_STATUSES.includes(a.status)).length;
  const active = apps.length - completed;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application command center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Move applications through your pipeline. Record outcomes and the system learns what works.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">{active} active</span>
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">{completed} completed</span>
        </div>
      </div>

      <div className="mt-6">
        <KanbanBoard applications={apps} onMove={move} />
      </div>
    </div>
  );
}
