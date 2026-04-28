import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useToast } from '@/components/ui/use-toast';

export default function MessageInput({ selectedNodeNum }) {
  const { nodes, sendText, connected } = useMeshStore();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [destination, setDestination] = useState(
    selectedNodeNum ? String(selectedNodeNum) : 'broadcast'
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;

    const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
    setSending(true);
    try {
      await sendText(msg, destNum, 0);
      setText('');
      toast({ title: 'Nachricht gesendet', description: msg.slice(0, 80) });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Senden fehlgeschlagen', description: e.message });
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!connected) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Nicht verbunden – Senden nicht verfügbar.
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="text-xs text-slate-500">Empfänger</div>
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

      <div className="text-xs text-slate-500 mt-1">Nachricht</div>
      <div className="flex gap-2">
        <Input
          className="flex-1 h-8 text-sm"
          placeholder="Nachricht… (Enter zum Senden)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="px-3 gap-1">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}