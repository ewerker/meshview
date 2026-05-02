import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';

export default function SendMessagePoc() {
  const { connected, nodes } = useMeshStore();
  const [open, setOpen] = useLocalStorage('sendMsgPoc.open', false);
  const [text, setText] = useState('');
  const [destination, setDestination] = useState('broadcast');
  const [channel, setChannel] = useState('0');
  const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  if (!connected) return null;

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
      await meshStore.serial.sendTextMessage(msg, destNum, parseInt(channel, 10) || 0);
      setStatus('ok');
      setText('');
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-b bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 px-3 py-2">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
          <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-100">Nachricht senden</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-tight">POC – Textnachricht über LoRa senden</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'ok' && <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Gesendet</Badge>}
          {status === 'error' && <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" /> Fehler</Badge>}
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="broadcast">📢 Broadcast (alle)</SelectItem>
                {nodes.map(node => {
                  const label = node.user?.longName || node.user?.shortName || `!${node.num?.toString(16).padStart(8, '0')}`;
                  return (
                    <SelectItem key={node.num} value={String(node.num)}>
                      📡 {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <SelectItem key={i} value={String(i)}>Ch {i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              className="flex-1 h-8 text-sm bg-white dark:bg-slate-900"
              placeholder="Nachricht… (Enter zum Senden)"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === 'sending'}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={status === 'sending' || !text.trim()}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Senden
            </Button>
          </div>
          {status === 'error' && errorMsg && (
            <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}