import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2, CheckCircle2, AlertCircle, UploadCloud, ChevronDown } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useAuth } from '@/lib/AuthContext';
import { saveMeshSnapshot } from '@/lib/meshtastic/persistence.js';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';

function NodeResultList({ title, nodes, tone, onSelectNode }) {
  const { t } = useI18n();
  if (!nodes?.length) return null;
  const toneClass = tone === 'new' ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300';

  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${toneClass}`}>{title} ({nodes.length})</div>
      <div className="flex flex-wrap gap-1.5">
        {nodes.slice(0, 20).map(node => (
          <button key={`${title}-${node.num}`} type="button" onClick={() => onSelectNode?.(node.num)}>
            <Badge variant="outline" className="text-[11px] font-mono cursor-pointer hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950">
              {node.long_name || node.short_name || node.node_id || `#${node.num?.toString(16).toUpperCase()}`}
            </Badge>
          </button>
        ))}
        {nodes.length > 20 && <Badge variant="secondary">{t('moreItems', { count: nodes.length - 20 })}</Badge>}
      </div>
    </div>
  );
}

export default function ManualSavePanel({ autoSaveStatus, autoSaveEnabled, onAutoSaveEnabled, onSelectNode }) {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const { t } = useI18n();
  const { connected, nodes, packetLog, myNodeNum, myNode } = useMeshStore();
  const [isOpen, setIsOpen] = useLocalStorage('manualSavePanel.open', true);
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
    setStatus(t('preparingData'));

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
      onAutoSaveEnabled?.();
      setStatus(t('saveCompleteAutosave'));
    } catch (e) {
      setError(e.message || t('saveFailed'));
      setStatus(null);
    }

    setSaving(false);
  };

  return (
    <div className="border-b bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 px-3 py-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <Database className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-slate-700 dark:text-slate-200">{t('save')}</div>
            <div className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {t('saveDescription')}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 justify-end">
          <Badge variant="secondary">{t('nodesDetected', { count: nodes.length })}</Badge>
          <Badge variant="secondary">{t('packetsReady', { count: packetLog.length })}</Badge>
          {myNodeNum && <Badge variant="outline">{t('deviceHash', { id: myNodeNum.toString(16).toUpperCase() })}</Badge>}
          {autoSaveEnabled && autoSaveStatus?.status === 'saving' && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t('autosaving')}</Badge>}
          {autoSaveEnabled && autoSaveStatus?.status === 'saved' && <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">{t('autosaved')}</Badge>}
          {autoSaveEnabled && autoSaveStatus?.status === 'error' && <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">{t('autoError')}</Badge>}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 flex justify-end">
          {isAuthenticated ? (
            <Button size="sm" onClick={handleSave} disabled={!canSave || saving} className="gap-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {saving ? t('saving') : t('saveNow')}
            </Button>
          ) : (
            <Button size="sm" onClick={navigateToLogin} className="gap-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              {t('loginToSave')}
            </Button>
          )}
        </div>
      )}

      {isOpen && (saving || status || result || error) && (
        <div className="mt-2 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 space-y-2">
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
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">{t('newNodes')}</div><div className="font-bold text-lg">{result.createdNodes.length}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">{t('updated')}</div><div className="font-bold text-lg">{result.updatedNodes.length}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">{t('packetsTransferred')}</div><div className="font-bold text-lg">{result.totalPackets ? `${result.savedPackets}/${result.totalPackets}` : result.savedPackets}</div></div>
                <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2"><div className="text-slate-500">{t('savedDevice')}</div><div className="font-bold text-sm font-mono">#{myNodeNum?.toString(16).toUpperCase()}</div></div>
              </div>
              <NodeResultList title={t('newlySaved')} nodes={result.createdNodes} tone="new" onSelectNode={onSelectNode} />
              <NodeResultList title={t('updated')} nodes={result.updatedNodes} tone="updated" onSelectNode={onSelectNode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}