import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { RotateCcw, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminPanel() {
  const { connected, myNode, myNodeNum, sendReboot } = useMeshStore();
  const { toast } = useToast();
  const [rebooting, setRebooting] = useState(false);

  const handleReboot = async () => {
    setRebooting(true);
    try {
      await sendReboot(5);
      toast({
        title: 'Reboot-Befehl gesendet',
        description: 'Das Gerät startet in ca. 5 Sekunden neu. Die Verbindung wird kurz unterbrochen.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Reboot fehlgeschlagen',
        description: e.message,
      });
    }
    setRebooting(false);
  };

  if (!connected) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Nicht verbunden – Admin-Befehle nicht verfügbar.
      </div>
    );
  }

  const nodeLabel =
    myNode?.user?.longName ||
    myNode?.user?.shortName ||
    (myNodeNum ? `!${myNodeNum.toString(16).padStart(8, '0')}` : 'Eigenes Gerät');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldAlert className="w-4 h-4" />
        <span>Befehle wirken auf: <strong className="text-slate-700 dark:text-slate-300">{nodeLabel}</strong></span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-500" />
            Geräte-Neustart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Startet das verbundene Meshtastic-Gerät nach 5 Sekunden neu. Die serielle Verbindung wird dabei unterbrochen und muss anschließend neu hergestellt werden.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={rebooting} className="gap-2">
                {rebooting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {rebooting ? 'Sende...' : 'Neustart auslösen'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerät wirklich neu starten?</AlertDialogTitle>
                <AlertDialogDescription>
                  Das Gerät <strong>{nodeLabel}</strong> wird in ca. 5 Sekunden neu gestartet. Die Verbindung zum Dashboard wird dadurch getrennt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleReboot}>Neustart</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}