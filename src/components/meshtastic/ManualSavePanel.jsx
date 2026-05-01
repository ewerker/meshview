import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useAuth } from '@/lib/AuthContext';
import { saveMeshSnapshot } from '@/lib/meshtastic/persistence.js';

function NodeResultList({ title, nodes, tone }) {
  if (!nodes?.length) return null;
  const toneClass = tone === 'new' ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300';

  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${toneClass}`}>{title} ({nodes.length})</div>
      <div className="flex flex-wrap gap-1.5">
        {nodes.slice(0, 20).map(node => (
          <Badge key={`${title}-${node.num}`} variant="outline" className="text-[11px] font-mono">
            {node.long_name || node.short_name || node.node_id || `#${node.num?.toString(16).toUpperCase()}`}
          </Badge>
        ))}
        {nodes.length > 20 && <Badge variant="secondary">+{nodes.length - 20} weitere</Badge>}
      </div>
    </div>
  );
}

export default function ManualSavePanel() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const { connected, nodes, packetLog, myNodeNum, myNode } = useMeshStore();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!connected) return null;

  const canSave = isAuthenticated && myNodeNum && (nodes.length > 0 || packetLog.length > 0);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    setError(null);
    setProgress(null);
    setStatus('Bereite Daten vor…');

    try {
      const saveResult = await saveMeshSnapshot({
        myNodeNum,
        myNode,
        nodes,
        packetLog,
        onProgress: (nextProgress) => {
          if (typeof nextProgress === 'string') {
            setStatus(nextProgress);
            setProgress(null);
            return;
          }
          setStatus(nextProgress.text);
          setProgress(nextProgress);
        },
      });
      setResult(saveResult);
      setStatus('Sicherung abgeschlossen');
    } catch (e) {
      setError(e.message || 'Sicherung fehlgeschlagen');
      setStatus(null);
    }

    setSaving(false);
  };

  return (
    <div className="border-b bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 px-4 py-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-blue-950 dark:text-blue-100">Manuelle Datensicherung</div>
            <div className="text-xs text-blue-800 dark:text-blue-200 mt-0.5">
              Nodes und empfangene Pakete werden erst gespeichert, wenn du auf „Jetzt sichern“ klickst.
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300">
              <Badge variant="secondary">{nodes.length} Nodes erkannt</Badge>
              <Badge variant="secondary">{packetLog.length} Pakete bereit</Badge>
              {myNodeNum && <Badge variant="outline">Gerät #{myNodeNum.toString(16).toUpperCase()}</Badge>}
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <Button onClick={handleSave} disabled={!canSave || saving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {saving ? 'Sichere…' : 'Jetzt sichern'}
          </Button>
        ) : (
          <Button onClick={navigateToLogin} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            Anmelden zum Sichern
          </Button>
        )}
      </div>

      {(saving || status || result || error) && (
        <div className="mt-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 p-3 space-y-3">
          {status && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {status}
              </div>
              {progress && progress.total > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{progress.current}/{progress.total}</Badge>
                  <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">{progress.created} neu</Badge>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100">{progress.updated} updated</Badge>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">Neue Nodes</div><div className="font-bold text-lg">{result.createdNodes.length}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">Aktualisiert</div><div className="font-bold text-lg">{result.updatedNodes.length}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">Pakete übertragen</div><div className="font-bold text-lg">{result.savedPackets}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">Gerät</div><div className="font-bold text-sm font-mono">#{myNodeNum?.toString(16).toUpperCase()}</div></div>
              </div>
              <NodeResultList title="Neu gespeichert" nodes={result.createdNodes} tone="new" />
              <NodeResultList title="Aktualisiert" nodes={result.updatedNodes} tone="updated" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}