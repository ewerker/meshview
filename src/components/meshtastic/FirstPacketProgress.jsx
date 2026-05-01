import { useEffect, useState } from 'react';
import { Loader2, Radio } from 'lucide-react';

export default function FirstPacketProgress({ visible }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.min(Date.now() - startedAt, 10000));
    }, 200);

    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const percent = Math.min(95, Math.round((elapsed / 10000) * 100));
  const seconds = Math.ceil((10000 - elapsed) / 1000);

  return (
    <div className="border-b bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">Warte auf erstes Datenpaket…</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
          <Radio className="w-3.5 h-3.5" />
          typischerweise bis zu {Math.max(seconds, 1)}s
        </div>
      </div>
      <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}