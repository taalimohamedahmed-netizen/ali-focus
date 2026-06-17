'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { fetchApiToken, generateApiToken } from '@/lib/api';

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1`;

export default function ApiTokenCard() {
  const { user } = useApp();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchApiToken(user.id).then(t => { setToken(t); setLoading(false); });
  }, [user]);

  if (!user) return null;

  const generate = async () => {
    setBusy(true);
    const t = await generateApiToken(user.id);
    setToken(t);
    setBusy(false);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const shown = token ?? 'aft_xxxxxxxxxxxx';
  const claudePrompt = `Add this to Ali Focus for me today (use my Ali Focus API).
Base URL: ${BASE}
Auth header: Authorization: Bearer ${shown}

Daily goal: 6 hours
Tasks:
1. Fix GlowGround mobile footer - high - must_finish - project GlowGround
2. Build Rains-style header - high - must_finish - project GlowGround
Sessions:
1. GlowGround footer - 90 minutes

Endpoints:
POST /daily-plan  { "target_hours": 6, "notes": "..." }
POST /tasks       { "title": "...", "project": "...", "priority": "high|medium|low", "type": "must_finish|optional" }
POST /sessions    { "title": "...", "project": "...", "estimated_minutes": 90, "auto_start": false }
GET  /today`;

  const curlExample = `curl -X POST ${BASE}/tasks \\
  -H "Authorization: Bearer ${shown}" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Fix Mobile Footer","project":"GlowGround","priority":"high","type":"must_finish"}'`;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">AI API Token</h3>
        <p className="text-xs text-gray-500 mt-0.5">Let Claude Code / Codex push tasks & sessions for you.</p>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={token ?? 'No token yet'}
              className="flex-1 px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg text-gray-700 truncate"
            />
            {token && (
              <button onClick={() => copy(token, 'token')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50">
                {copied === 'token' ? '✓' : 'Copy'}
              </button>
            )}
          </div>

          <button onClick={generate} disabled={busy}
            className="w-full py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Generating…' : token ? 'Regenerate token' : 'Generate API token'}
          </button>
          {token && <p className="text-[11px] text-gray-400">Regenerating invalidates the old token.</p>}
        </>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-orange-600 font-medium">AI Agent setup &amp; examples</summary>
        <div className="mt-2 space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500">Paste to Claude Code / Codex</span>
              <button onClick={() => copy(claudePrompt, 'prompt')} className="text-orange-600">{copied === 'prompt' ? '✓ copied' : 'Copy'}</button>
            </div>
            <pre className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg p-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-gray-700">{claudePrompt}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500">curl example</span>
              <button onClick={() => copy(curlExample, 'curl')} className="text-orange-600">{copied === 'curl' ? '✓ copied' : 'Copy'}</button>
            </div>
            <pre className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg p-2 overflow-x-auto text-[11px] text-gray-700">{curlExample}</pre>
          </div>
          <p className="text-gray-400">Base URL: <span className="font-mono">{BASE}</span></p>
        </div>
      </details>
    </div>
  );
}
