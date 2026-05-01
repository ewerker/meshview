import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Usb, WifiOff, Loader2, Radio, HelpCircle, Info, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';
import LanguageSwitcher from '@/components/LanguageSwitcher.jsx';
import { useDarkMode } from '@/lib/DarkModeContext';
import { useAuth } from '@/lib/AuthContext';

export default function ConnectionBar() {
  const { connected, isSupported, connect, disconnect, nodes, myNode, metadata } = useMeshStore();
  const { t } = useI18n();
  const { isDark, toggleDark } = useDarkMode();
  const { isAuthenticated, user, navigateToLogin, logout } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (e) {
      alert(t('connectionFailed', { message: e.message }));
    }
    setConnecting(false);
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-green-400" />
        <span className="font-bold text-lg tracking-wide">{t('appName')}</span>
        <span className="text-slate-500 text-xs">{t('version')}</span>
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
            <Badge className="bg-green-500/15 text-green-300 border border-green-400/40 hover:bg-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1.5" />
              {t('onlineMode')}
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-400/40 hover:bg-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
              {t('offlineMode')}
            </Badge>
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

        <LanguageSwitcher />

        <Button size="sm" variant="ghost" onClick={toggleDark} className="text-slate-300 hover:text-white px-2">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {isAuthenticated ? (
          <Button size="sm" variant="ghost" onClick={() => logout()} className="text-slate-300 hover:text-white gap-1.5" title={user?.email}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </Button>
        ) : (
          <Button size="sm" onClick={navigateToLogin} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <LogIn className="w-4 h-4" />
            {t('login')}
          </Button>
        )}

        {!isSupported ? (
          <span className="text-red-400 text-sm">{t('webSerialUnsupported')}</span>
        ) : connected ? (
          <Button size="sm" variant="destructive" onClick={disconnect} className="gap-2">
            <WifiOff className="w-4 h-4" />
            {t('disconnect')}
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-2 bg-green-600 hover:bg-green-700">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
            {connecting ? t('connecting') : t('connectDevice')}
          </Button>
        )}
      </div>
    </div>
  );
}