import { useEffect, useState } from 'react';
import { Loader2, Radio, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';

export default function FirstPacketProgress({ visible }) {
  const [elapsed, setElapsed] = useState(0);
  const [isOpen, setIsOpen] = useLocalStorage('firstPacketProgress.open', true);
  const { t } = useI18n();

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
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">{t('firstPacketWaiting')}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
          <Radio className="w-3.5 h-3.5" />
          {t('typicallyUpTo', { seconds: Math.max(seconds, 1) })}
        </div>
      </button>
      {isOpen && (
        <div className="mt-2 h-2 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}