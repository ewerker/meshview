import { Wifi, WifiOff, History } from 'lucide-react';

/**
 * Big visible ONLINE / OFFLINE banner shown on top of dashboard views.
 * mode: "online"  -> live USB connection
 *       "offline" -> historical (from DB), no USB
 */
export default function StatusBanner({ mode }) {
  if (mode === 'online') {
    return (
      <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold tracking-wide shadow-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <Wifi className="w-4 h-4" />
        ONLINE — Live-Daten vom Gerät
      </div>
    );
  }

  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold tracking-wide shadow-sm">
      <WifiOff className="w-4 h-4" />
      OFFLINE — Historische Daten aus der Datenbank
      <History className="w-4 h-4 opacity-80" />
    </div>
  );
}