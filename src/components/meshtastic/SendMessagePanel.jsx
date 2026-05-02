import { useMemo, useState } from 'react';
import { Send, Lock, Unlock, ChevronDown, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { getSendableChannels } from '@/lib/meshtastic/channels.js';
import OutgoingMessageStatus from './OutgoingMessageStatus.jsx';
import SendMessageOptions from './SendMessageOptions.jsx';
import OutgoingPacketPreview from './OutgoingPacketPreview.jsx';

export default function SendMessagePanel() {
  const store = useMeshStore();
  const [isOpen, setIsOpen] = useLocalStorage('sendMessagePanel.open', true);
  const [channelIndex, setChannelIndex] = useLocalStorage('sendMessagePanel.channel', 0);
  const [sendOpts, setSendOpts] = useLocalStorage('sendMessagePanel.sendOpts', {
    kind: 'broadcast',     // 'broadcast' | 'direct'
    destination: null,     // node num for DM
    hopLimit: 3,
    wantAck: true,
  });
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null); // 'sending' | 'sent' | 'error'
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const channels = useMemo(() => getSendableChannels(store.deviceConfigs), [store.deviceConfigs]);

  if (!store.connected) return null;

  const openPreview = () => {
    setError(null);
    if (sendOpts.kind === 'direct' && !sendOpts.destination) {
      setError('Bitte einen Empfänger-Node auswählen.');
      setStatus('error');
      return;
    }
    setPreviewOpen(true);
  };

  const handleConfirmSend = async () => {
    setStatus('sending');
    try {
      await store.sendChannelMessage(text.trim(), Number(channelIndex), {
        destination: sendOpts.kind === 'direct' ? sendOpts.destination : undefined,
        hopLimit: sendOpts.hopLimit,
        wantAck: sendOpts.wantAck,
      });
      setText('');
      setPreviewOpen(false);
      setStatus('sent');
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setError(e.message || 'Senden fehlgeschlagen');
      setStatus('error');
    }
  };

  const selected = channels.find(c => c.index === Number(channelIndex)) || channels[0];

  return (
    <div className="border-b bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 px-3 py-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-100">Nachricht senden (POC)</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-tight">
              Sendet über das verbundene Gerät. Verschlüsselung übernimmt das Gerät anhand der Channel-Config.
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-emerald-200 dark:border-emerald-800">
          {channels.length} Channel{channels.length === 1 ? '' : 's'}
        </Badge>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-md bg-white dark:bg-slate-950 border border-emerald-100 dark:border-emerald-900 p-3 space-y-2">
          {channels.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4" /> Noch keine Channels vom Gerät empfangen — bitte „Config lesen" oben.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={String(channelIndex)} onValueChange={v => setChannelIndex(Number(v))}>
                  <SelectTrigger className="sm:w-56 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map(c => (
                      <SelectItem key={c.index} value={String(c.index)}>
                        <span className="flex items-center gap-2">
                          {c.isEncrypted ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                          <span className="font-mono">Ch {c.index}</span>
                          <span>· {c.name}</span>
                          {c.isDefault && <span className="text-[10px] text-slate-400">(default)</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && text.trim() && status !== 'sending') openPreview(); }}
                  placeholder="Nachricht eingeben…"
                  className="flex-1 h-9 text-sm"
                  maxLength={200}
                />

                <Button onClick={openPreview} disabled={!text.trim() || status === 'sending'} size="sm" className="h-9 gap-1.5">
                  {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Vorschau & Senden
                </Button>
              </div>

              <SendMessageOptions
                value={sendOpts}
                onChange={setSendOpts}
                nodes={store.nodes}
                myNodeNum={store.myNodeNum}
              />

              <OutgoingPacketPreview
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                text={text}
                channelIndex={channelIndex}
                sendOpts={sendOpts}
                onConfirm={handleConfirmSend}
                sending={status === 'sending'}
              />

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {selected?.isEncrypted ? (
                    <><Lock className="w-3 h-3 text-amber-600" /> Verschlüsselter Channel — Gerät verschlüsselt automatisch.</>
                  ) : (
                    <><Unlock className="w-3 h-3 text-slate-400" /> Öffentlich/Default — keine zusätzliche Verschlüsselung.</>
                  )}
                </div>
                <span className="text-slate-400">{text.length}/200</span>
              </div>

              {status === 'sent' && (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-4 h-4" /> An Serial geschrieben — warte auf Geräte-/Mesh-Bestätigung.
                </div>
              )}
              {status === 'error' && error && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <OutgoingMessageStatus outgoing={store.outgoing} />
            </>
          )}
        </div>
      )}
    </div>
  );
}