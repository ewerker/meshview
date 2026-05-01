import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Usb, WifiOff, Loader2, Radio, HelpCircle, Info, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useDarkMode } from '@/lib/DarkModeContext';
import { useAuth } from '@/lib/AuthContext';

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

  return (
    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-green-400" />
        <span className="font-bold text-lg tracking-wide">Meshtastic Dashboard</span>
        <span className="text-slate-500 text-xs">v1.0.0</span>
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
              <span className="text-green-400 text-sm">Verbunden</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 text-sm">Getrennt</span>
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
          <Button size="sm" variant="ghost" onClick={() => logout()} className="text-slate-300 hover:text-white gap-1.5" title={user?.email}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={navigateToLogin} className="text-slate-300 hover:text-white gap-1.5">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Anmelden</span>
          </Button>
        )}

        {!isSupported ? (
          <span className="text-red-400 text-sm">Web Serial nicht unterstützt (Chrome/Edge erforderlich)</span>
        ) : connected ? (
          <Button size="sm" variant="destructive" onClick={disconnect} className="gap-2">
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