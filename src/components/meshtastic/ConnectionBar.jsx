import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Usb, WifiOff, Loader2, Radio, HelpCircle, Info, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useDarkMode } from '@/lib/DarkModeContext';
import { useAuth } from '@/lib/AuthContext';
import PersistenceProgress from './PersistenceProgress.jsx';
import { isPersistenceBusy, flushNow } from '@/lib/meshtastic/persistence.js';

export default function ConnectionBar() {
  const { connected, isSupported, connect, disconnect, nodes, myNode, metadata } = useMeshStore();
  const { isDark, toggleDark } = useDarkMode();
  const { isAuthenticated, user, navigateToLogin, logout } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (e) {
      alert('Verbindung fehlgeschlagen: ' + e.message);
    }
    setConnecting(false);
  };

  // Flush first, then only warn if something is *still* pending afterwards.
  const flushAndConfirm = async (action) => {
    if (!isAuthenticated) return true;
    try { await flushNow(); } catch {}
    if (!isPersistenceBusy()) return true;
    return window.confirm(
      `Es werden gerade noch Daten gespeichert.\n\nWenn du jetzt ${action}, gehen ungespeicherte Daten möglicherweise verloren.\n\nTrotzdem fortfahren?`
    );
  };

  const handleDisconnect = async () => {
    // Stop incoming packets first so the flush has a stable buffer to drain
    disconnect();
    if (!(await flushAndConfirm('die Verbindung trennst'))) return;
  };

  const handleLogout = async () => {
    if (!(await flushAndConfirm('dich abmeldest'))) return;
    logout();
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-green-400" />
        <span className="font-bold text-lg tracking-wide hidden sm:inline">Meshtastic Dashboard</span>
        <span className="text-slate-500 text-xs hidden sm:inline">v1.1.0</span>
        <PersistenceProgress active={isAuthenticated} />
      </div>

      <div className="flex items-center gap-3">
        {connected && (
          <>
            <Badge variant="outline" className="text-green-400 border-green-400">
              {nodes.length} Nodes
            </Badge>
            {myNode?.user?.longName && (
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {myNode.user.shortName || myNode.user.longName}
              </Badge>
            )}
          </>
        )}

        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm hidden sm:inline">Verbunden</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 text-sm hidden sm:inline">Getrennt</span>
            </div>
          )}
        </div>

        <Link to="/help">
          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white px-2">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </Link>
        <Link to="/about">
          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white px-2">
            <Info className="w-4 h-4" />
          </Button>
        </Link>

        <Button size="sm" variant="ghost" onClick={toggleDark} className="text-slate-300 hover:text-white px-2">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {isAuthenticated ? (
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-300 hover:text-white gap-1.5" title={user?.email}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        ) : (
          <Button size="sm" onClick={navigateToLogin} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <LogIn className="w-4 h-4" />
            Anmelden
          </Button>
        )}

        {!isSupported ? (
          <span className="text-red-400 text-sm">Web Serial nicht unterstützt (Chrome/Edge erforderlich)</span>
        ) : connected ? (
          <Button size="sm" variant="destructive" onClick={handleDisconnect} className="gap-2">
            <WifiOff className="w-4 h-4" />
            Trennen
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-2 bg-green-600 hover:bg-green-700">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
            {connecting ? 'Verbinde...' : 'Mit Gerät verbinden'}
          </Button>
        )}
      </div>
    </div>
  );
}