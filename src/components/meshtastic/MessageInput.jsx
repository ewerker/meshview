import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

export default function MessageInput({ nodes, selectedNodeNum, deviceConfigs = [] }) {
  const [text, setText] = useState('');
  const [destination, setDestination] = useState('broadcast');
  const [channel, setChannel] = useState('0');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // 'ok' | 'error' | null

  useEffect(() => {
    if (selectedNodeNum) setDestination(String(selectedNodeNum));
  }, [selectedNodeNum]);

  // Build channel list from deviceConfigs (Channel 0 = primary, etc.)
  const channelOptions = (() => {
    const configs = (deviceConfigs || []).filter(c => c.category === 'channel' && c.payload?.role !== 0);
    if (configs.length === 0) {
      return [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ index: i, label: `Ch ${i}` }));
    }
    return configs.map(c => ({
      index: c.payload?.index ?? 0,
      label: c.payload?.settings?.name
        ? `${c.payload.settings.name} (Ch ${c.payload?.index ?? 0})`
        : `Ch ${c.payload?.index ?? 0}`,
    })).sort((a, b) => a.index - b.index);
  })();

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    const destNum = destination === 'broadcast' ? 0xffffffff : parseInt(destination);
    setSending(true);
    setSendStatus(null);
    try {
      await meshStore.serial.sendTextMessage(msg, destNum, parseInt(channel, 10) || 0);
      setText('');
      setSendStatus('ok');
      setTimeout(() => setSendStatus(null), 2000);
    } catch (e) {
      setSendStatus('error');
      setTimeout(() => setSendStatus(null), 4000);
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
    <div className="border-t bg-white dark:bg-slate-950 p-3 flex flex-col gap-2 shrink-0">
      <div className="flex gap-2">
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger className="flex-1 h-8 text-xs min-w-0">
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
          <SelectTrigger className="w-32 h-8 text-xs shrink-0">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            {channelOptions.map(opt => (
              <SelectItem key={opt.index} value={String(opt.index)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 items-center">
        <Input
          className="flex-1 h-8 text-sm"
          placeholder="Nachricht eingeben… (Enter zum Senden)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="px-3 shrink-0">
          {sendStatus === 'ok'
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : sendStatus === 'error'
            ? <AlertCircle className="w-4 h-4 text-red-500" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>
      {sendStatus === 'error' && (
        <div className="text-xs text-red-500">Senden fehlgeschlagen. Ist das Gerät verbunden?</div>
      )}
    </div>
  );
}