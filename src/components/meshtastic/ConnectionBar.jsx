import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Usb, Wifi, WifiOff, Loader2, Radio } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';

export default function ConnectionBar() {
  const { connected, isSupported, connect, disconnect, nodes, myNode, metadata } = useMeshStore();
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
        {metadata?.firmwareVersion && (
          <span className="text-slate-400 text-sm">FW {metadata.firmwareVersion}</span>
        )}
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