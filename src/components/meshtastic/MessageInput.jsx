import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

export default function MessageInput({ nodes, selectedNodeNum, selectedChannel = 0 }) {
  const [text, setText] = useState('');
  const [destination, setDestination] = useState('broadcast');
  const [channel, setChannel] = useState(String(selectedChannel ?? 0));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (selectedNodeNum) setDestination(String(selectedNodeNum));
  }, [selectedNodeNum]);

  useEffect(() => {
    setChannel(String(selectedChannel ?? 0));
  }, [selectedChannel]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;

    const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
    setSending(true);
    try {
      await meshStore.serial.sendTextMessage(msg, destNum, parseInt(channel, 10) || 0);
      setText('');
    } catch (e) {
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
    <div className="border-y bg-white dark:bg-slate-950 p-3 flex flex-col gap-2 shrink-0 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
      <Select value={destination} onValueChange={setDestination}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="broadcast">📢 Broadcast (alle Nodes)</SelectItem>
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
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(index => (
            <SelectItem key={index} value={String(index)}>Ch {index}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>
      <div className="flex gap-2">
        <Input
          className="flex-1 h-8 text-sm"
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          autoFocus
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="px-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}