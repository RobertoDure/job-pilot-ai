import { useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_META } from '../lib';
import type { ApplicationStatus, EnrichedApplication } from '../types';
import { ScoreBar } from './ui';

export type KanbanColumnId = 'recommended' | 'applied' | 'interview' | 'completed';

// The board shows four stages. The three terminal outcomes are grouped under
// the "Completed" column so the pipeline stays short and scannable while the
// backend (and the insights/response-rate analytics) keep their granularity.
const COMPLETED_STATUSES: ApplicationStatus[] = ['offer', 'rejected', 'no_response'];

interface ColumnDef {
  id: KanbanColumnId;
  label: string;
  description: string;
  statuses: ApplicationStatus[];
  dot: string;
  accent: string;
  empty: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'recommended',
    label: 'Recommended',
    description: 'Shortlisted for you',
    statuses: ['recommended'],
    dot: 'bg-sky-500',
    accent: 'text-sky-700',
    empty: 'Nothing recommended yet. Strong matches land here first.',
  },
  {
    id: 'applied',
    label: 'Applied',
    description: 'Awaiting a response',
    statuses: ['applied'],
    dot: 'bg-brand-skyDark',
    accent: 'text-brand-navy',
    empty: 'No applications yet. Move a recommendation here once submitted.',
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'In process',
    statuses: ['interview'],
    dot: 'bg-brand-sky',
    accent: 'text-brand-navy',
    empty: 'No interviews scheduled yet.',
  },
  {
    id: 'completed',
    label: 'Completed',
    description: 'Outcome recorded',
    statuses: COMPLETED_STATUSES,
    dot: 'bg-emerald-500',
    accent: 'text-emerald-700',
    empty: 'Nothing completed yet. Finished applications land here with their outcome.',
  },
];

const COMPLETED_BUTTON: Record<string, string> = {
  offer: 'bg-emerald-600 hover:bg-emerald-700',
  rejected: 'bg-rose-600 hover:bg-rose-700',
  no_response: 'bg-slate-600 hover:bg-slate-700',
};

function columnOf(status: ApplicationStatus): KanbanColumnId {
  if (COMPLETED_STATUSES.includes(status)) return 'completed';
  return status as KanbanColumnId;
}

function scorePill(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 62) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

interface KanbanBoardProps {
  applications: EnrichedApplication[];
  onMove: (app: EnrichedApplication, status: ApplicationStatus) => void;
}

export default function KanbanBoard({ applications, onMove }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnId | null>(null);
  const [completing, setCompleting] = useState<EnrichedApplication | null>(null);

  const grouped = COLUMNS.map((col) => ({
    col,
    apps: applications.filter((a) => col.statuses.includes(a.status)),
  }));

  function handleDragStart(e: DragEvent<HTMLElement>, app: EnrichedApplication) {
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(app.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  function handleDrop(e: DragEvent<HTMLElement>, col: ColumnDef) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDragOverCol(null);
    const app = applications.find((a) => a.id === id);
    if (!app) return;

    const current = columnOf(app.status);
    if (col.id === current) {
      setDraggingId(null);
      return;
    }

    // Completing needs a concrete outcome, so ask before persisting anything.
    if (col.id === 'completed') {
      setCompleting(app);
      return;
    }

    onMove(app, col.id);
    setDraggingId(null);
  }

  function completeAs(status: ApplicationStatus) {
    if (completing) onMove(completing, status);
    setCompleting(null);
    setDraggingId(null);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-stretch gap-4">
        {grouped.map(({ col, apps }) => {
          const isOver = dragOverCol === col.id;
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverCol((c) => (c === col.id ? null : c));
                }
              }}
              onDrop={(e) => handleDrop(e, col)}
              className={
                'flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-slate-100/70 transition sm:w-80 ' +
                (isOver ? 'border-brand-sky ring-2 ring-brand-sky/30' : 'border-slate-200')
              }
            >
              <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + col.dot} />
                  <div className="min-w-0">
                    <div className={'truncate text-xs font-bold uppercase tracking-wide ' + col.accent}>{col.label}</div>
                    <div className="truncate text-[11px] text-slate-400">{col.description}</div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm">
                  {apps.length}
                </span>
              </header>

              <div className="min-h-[24rem] max-h-[70vh] flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app)}
                    onDragEnd={handleDragEnd}
                    className={
                      'group cursor-grab rounded-xl border bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ' +
                      (draggingId === app.id ? 'border-brand-sky/40 opacity-40 ring-2 ring-brand-sky/30' : 'border-slate-200')
                    }
                  >
                    {app.job ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={'/jobs/' + app.job.id}
                              className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-sky"
                            >
                              {app.job.title}
                            </Link>
                            <div className="mt-0.5 truncate text-xs text-slate-500">{app.job.company}</div>
                          </div>
                          <span
                            className={
                              'inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-xs font-bold ' + scorePill(app.matchScore)
                            }
                          >
                            {app.matchScore}%
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <ScoreBar value={app.matchScore} />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          {columnOf(app.status) === 'completed' ? (
                            <select
                              value={app.status}
                              onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
                              className="shrink-0 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 shadow-sm focus:border-brand-sky focus:outline-none"
                              title="Change outcome"
                            >
                              <option value="offer">Offer</option>
                              <option value="rejected">Rejected</option>
                              <option value="no_response">No response</option>
                            </select>
                          ) : (
                            <span className="truncate text-xs text-slate-400">
                              {[app.job.location.city, app.job.location.country].filter(Boolean).join(', ') || 'Remote'}
                            </span>
                          )}
                          <select
                            value={columnOf(app.status)}
                            onChange={(e) => {
                              const next = e.target.value as KanbanColumnId;
                              if (next === 'completed') setCompleting(app);
                              else onMove(app, next);
                            }}
                            className="shrink-0 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 shadow-sm focus:border-brand-sky focus:outline-none"
                            title="Move application"
                          >
                            <option value="recommended">Recommended</option>
                            <option value="applied">Applied</option>
                            <option value="interview">Interview</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">Unknown job</div>
                    )}
                  </div>
                ))}

                {apps.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    {col.empty}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {completing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCompleting(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-slate-900">Complete application</div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {completing.job?.title ?? 'Untitled'}{completing.job?.company ? ' · ' + completing.job.company : ''}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {COMPLETED_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => completeAs(s)}
                  className={'rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm ' + COMPLETED_BUTTON[s]}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCompleting(null)}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}