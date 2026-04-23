import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, CheckCheck } from 'lucide-react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

// Simulated send progress: ramps to 80% quickly, holds, then completes on resolve
function useSendProgress() {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const start = () => {
    setProgress(5);
    let p = 5;
    timerRef.current = setInterval(() => {
      p = p + (80 - p) * 0.18;
      setProgress(Math.min(p, 79));
    }, 80);
  };

  const finish = (success = true) => {
    clearInterval(timerRef.current);
    setProgress(success ? 100 : 0);
    setTimeout(() => setProgress(0), 700);
  };

  return { progress, start, finish };
}

const LS_KEY = 'meshtastic_last_destination';
const LS_CHANNEL_KEY = 'meshtastic_last_channel';

export default function MessageInput({ nodes, selectedNodeNum }) {
  const [text, setText] = useState('');
  const [destination, setDestination] = useState(() => localStorage.getItem(LS_KEY) || 'broadcast');
  const [channel, setChannel] = useState(() => parseInt(localStorage.getItem(LS_CHANNEL_KEY) || '1'));
  const [wantAck, setWantAck] = useState(false);
  const [sending, setSending] = useState(false);
  const { progress, start, finish } = useSendProgress();

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;

    const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
    setSending(true);
    start();
    try {
      await meshStore.sendTextMessage(msg, destNum, channel, wantAck);
      setText('');
      finish(true);
    } catch (e) {
      finish(false);
      alert('Fehler beim Senden: ' + e.message);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-3 flex flex-col gap-2 shrink-0">
      {/* Destination + Channel selectors */}
      <div className="flex gap-1.5">
        <Select value={destination} onValueChange={v => { setDestination(v); localStorage.setItem(LS_KEY, v); }}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs text-slate-400">Ziel</SelectLabel>
              <SelectItem value="broadcast">📢 Broadcast (alle Nodes)</SelectItem>
              {nodes.map(node => {
                const label = node.user?.longName || node.user?.shortName || `!${node.num?.toString(16).padStart(8, '0')}`;
                return (
                  <SelectItem key={node.num} value={String(node.num)}>
                    📡 {label}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={String(channel)} onValueChange={v => { setChannel(parseInt(v)); localStorage.setItem(LS_CHANNEL_KEY, v); }}>
          <SelectTrigger className="h-8 text-xs w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs text-slate-400">Kanal</SelectLabel>
              {[0,1,2,3,4,5,6,7,8,9].map(ch => (
                <SelectItem key={ch} value={String(ch)}>
                  📻 Kanal {ch}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <Input
          className="flex-1 h-8 text-sm"
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="px-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* ACK toggle + progress bar row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Switch
            id="want-ack"
            checked={wantAck}
            onCheckedChange={setWantAck}
            disabled={sending}
            className="scale-75 origin-left"
          />
          <Label htmlFor="want-ack" className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer select-none">
            <CheckCheck className="w-3 h-3" />
            ACK erwünscht
          </Label>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}