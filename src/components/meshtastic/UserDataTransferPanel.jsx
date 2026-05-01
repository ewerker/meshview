import { useRef, useState } from 'react';
import { ChevronDown, Download, Upload, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
import { useAuth } from '@/lib/AuthContext';

export default function UserDataTransferPanel() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [isOpen, setIsOpen] = useLocalStorage('userDataTransferPanel.open', true);
  const [mode, setMode] = useState('merge');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);

    const response = await base44.functions.invoke('exportUserData', {});
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meshtastic-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setStatus('Export erstellt. Es wurden keine Daten gelöscht.');
    setBusy(false);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    const text = await file.text();
    const data = JSON.parse(text);
    const response = await base44.functions.invoke('importUserData', { data, mode });
    const totals = Object.values(response.data.result || {}).reduce((sum, item) => ({
      deleted: sum.deleted + (item.deleted || 0),
      created: sum.created + (item.created || 0),
      updated: sum.updated + (item.updated || 0),
    }), { deleted: 0, created: 0, updated: 0 });

    setStatus(`Import fertig: ${totals.created} ergänzt, ${totals.updated} aktualisiert${totals.deleted ? `, ${totals.deleted} ersetzt` : ''}.`);
    setBusy(false);
    event.target.value = '';
  };

  if (!isAuthenticated) {
    return (
      <div className="border-b bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Database className="w-4 h-4" /> Daten-Export / Import
          </div>
          <Button size="sm" onClick={navigateToLogin}>Zum Import/Export anmelden</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 px-3 py-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <Database className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-slate-700 dark:text-slate-200">Daten-Export / Import</div>
            <div className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Alle gespeicherten Nodes, Pakete und Geräte-Configs als JSON sichern oder wiederherstellen.
            </div>
          </div>
        </div>
        <Badge variant="outline">JSON</Badge>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button size="sm" onClick={handleExport} disabled={busy} className="gap-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportieren
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs"
              >
                <option value="merge">Aktualisieren / ergänzen</option>
                <option value="replace">Ersetzen</option>
              </select>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importieren
              </Button>
            </div>
          </div>

          {status && <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"><CheckCircle2 className="w-4 h-4" />{status}</div>}
          {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-300"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
      )}
    </div>
  );
}