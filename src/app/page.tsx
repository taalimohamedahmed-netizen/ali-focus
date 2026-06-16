'use client';

import { useState, useRef } from 'react';
import { TabId } from '@/types';
import { useApp } from '@/lib/AppContext';
import TodayTab from '@/components/TodayTab';
import DeadlinesTab from '@/components/DeadlinesTab';
import ProgressTab from '@/components/ProgressTab';
import SyncIndicator from '@/components/SyncIndicator';
import PasswordGate from '@/components/PasswordGate';

const tabs: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'progress', label: 'Progress' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const { importJson, exportJson } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ali-focus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importJson(text);
      setImportStatus(success ? 'success' : 'error');
      setTimeout(() => setImportStatus('idle'), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8">
      <PasswordGate />
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Ali Focus</h1>
          <SyncIndicator />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          {importStatus === 'success' && (
            <span className="text-xs text-green-600 font-medium">Imported!</span>
          )}
          {importStatus === 'error' && (
            <span className="text-xs text-red-600 font-medium">Invalid file</span>
          )}
        </div>
      </header>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'deadlines' && <DeadlinesTab />}
      {activeTab === 'progress' && <ProgressTab />}
    </div>
  );
}
