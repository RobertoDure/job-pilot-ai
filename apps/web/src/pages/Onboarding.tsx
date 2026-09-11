import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';

const STEPS = ['Find', 'Filter', 'Match', 'Tailor CV', 'Apply', 'Track', 'Improve'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setProfileData, session } = useApp();

  if (!session) return <Navigate to="/auth" replace />;
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(payload: { text?: string; filename?: string; contentBase64?: string; useSample?: boolean }) {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.analyzeCv(payload);
      setProfileData(res.profile, res.summary);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        void submit({ filename: file.name, contentBase64: btoa(binary) });
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => void submit({ text: String(reader.result || ''), filename: file.name });
      reader.readAsText(file);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-skyDark">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl">{'\u2708'}</div>
              <span className="text-2xl font-bold">JobPilot AI</span>
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
              Your personal AI job-search copilot
            </h1>
            <p className="mt-4 max-w-md text-lg text-sky-200">
              Upload your CV. In under two minutes we build your career profile and start finding the jobs you should apply for &mdash; with an explainable match score for every one.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {STEPS.map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-lg bg-white/15 px-2.5 py-1">{s}</span>
                  {i < STEPS.length - 1 ? <span className="text-sky-300">{'\u2192'}</span> : null}
                </span>
              ))}
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">2 min</div>
                <div className="text-xs text-sky-200">to your career profile</div>
              </div>
              <div>
                <div className="text-2xl font-bold">Explainable</div>
                <div className="text-xs text-sky-200">match scores</div>
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-sky-200">skills invented, ever</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Build your career profile</h2>
            <p className="mt-1 text-sm text-slate-500">Paste your CV, upload a PDF/DOCX, or try the instant demo.</p>

            <button
              onClick={() => void submit({ useSample: true })}
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-navy to-brand-skyDark px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? 'Analysing...' : '\u2728 Use sample CV (instant demo)'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Paste your CV
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={'Paste your CV text here...\n\nName\nHeadline\nSkills\nExperience\nEducation'}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
              />
            </label>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => void submit({ text })}
                disabled={submitting || !text.trim()}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Analyse my CV
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Upload file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.docx,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            {fileName ? <div className="mt-2 text-xs text-slate-500">Selected: {fileName}</div> : null}
            {error ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}