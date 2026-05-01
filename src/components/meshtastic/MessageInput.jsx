import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

export default function MessageInput({ nodes, selectedNodeNum }) {
  const [text, setText] = useState('');
  const [destination, setDestination] = useState('broadcast');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (selectedNodeNum) setDestination(String(selectedNodeNum));
  }, [selectedNodeNum]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;

    const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
    setSending(true);
    try {
      await meshStore.serial.sendTextMessage(msg, destNum);
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