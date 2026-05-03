import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Usb, Loader2 } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';

const REASON_LABELS = {
  usb_unplugged: 'USB-Kabel/Gerät wurde entfernt',
  port_unreadable: 'Serieller Port nicht mehr lesbar',
  read_error: 'Lesefehler auf der seriellen Verbindung',
  unknown: 'Unbekannter Grund',
};

const REASON_HINTS = {
  usb_unplugged: 'Prüfe, ob das USB-Kabel fest sitzt und das Gerät mit Strom versorgt ist.',
  port_unreadable: 'Das Gerät hat möglicherweise einen Reset durchgeführt oder den Port geschlossen. Prüfe Strom und Kabel.',
  read_error: 'Das kann durch einen Geräte-Reset, Treiberproblem oder USB-Stromschwankung passieren.',
  unknown: 'Versuche das Gerät erneut zu verbinden.',
};

export default function UnexpectedDisconnectDialog() {
  const { lastDisconnect, clearLastDisconnect, connect, isSupported } = useMeshStore();
  const [reconnecting, setReconnecting] = useState(false);

  // Nur bei spontaner Trennung anzeigen — nicht bei manuellem Disconnect
  const open = !!lastDisconnect && lastDisconnect.reason !== 'manual';

  const handleClose = () => {
    clearLastDisconnect();
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await connect();
      clearLastDisconnect();
    } catch (e) {
      // Browser kann z. B. keine Berechtigung geben — Dialog offen lassen
    }
    setReconnecting(false);
  };

  if (!open) return null;

  const reasonLabel = REASON_LABELS[lastDisconnect.reason] || REASON_LABELS.unknown;
  const reasonHint = REASON_HINTS[lastDisconnect.reason] || REASON_HINTS.unknown;
  const time = new Date(lastDisconnect.time).toLocaleTimeString('de-DE');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Verbindung unerwartet getrennt
          </DialogTitle>
          <DialogDescription>
            Das Meshtastic-Gerät wurde getrennt, ohne dass der Trennen-Button benutzt wurde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
            <div className="font-semibold text-amber-900 dark:text-amber-200">{reasonLabel}</div>
            {lastDisconnect.message && (
              <div className="text-xs text-amber-800/80 dark:text-amber-200/80 font-mono break-words">
                {lastDisconnect.message}
              </div>
            )}
            <div className="text-xs text-amber-700 dark:text-amber-300">Zeitpunkt: {time}</div>
          </div>
          <p className="text-slate-600 dark:text-slate-300">{reasonHint}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose}>Schließen</Button>
          {isSupported && (
            <Button onClick={handleReconnect} disabled={reconnecting} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              {reconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
              {reconnecting ? 'Verbinde…' : 'Erneut verbinden'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}