import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Radio, ChevronLeft, Eye, Save, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadRules, saveRules, defaultRule, renderTemplate, haversineKm } from '@/lib/meshtastic/autoresponder.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';

const VARIABLES = [
  { group: 'Sender-Node', vars: ['sender.longName','sender.shortName','sender.id','sender.lat','sender.lon','sender.alt','sender.battery','sender.voltage','sender.temp','sender.humidity','sender.pressure','sender.uptime','sender.channelUtil','sender.txAirUtil'] },
  { group: 'Mein Gerät', vars: ['my.longName','my.shortName','my.id','my.lat','my.lon','my.alt','my.battery','my.voltage','my.uptime'] },
  { group: 'Nachricht', vars: ['msg.text','msg.snr','msg.rssi','msg.hops','msg.time','msg.distKm'] },
];

function VariableChip({ v, onInsert }) {
  return (
    <button
      onClick={() => onInsert(`{{${v}}}`)}
      className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-mono transition-colors"
    >
      {`{{${v}}}`}
    </button>
  );
}

function FilterSection({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  return (
    <div className="space-y-4">
      {/* Text */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nachrichtentext</Label>
        <div className="flex gap-2">
          <Select value={filters.textMatchMode} onValueChange={v => set('textMatchMode', v)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Beliebig</SelectItem>
              <SelectItem value="contains">Enthält</SelectItem>
              <SelectItem value="startsWith">Beginnt mit</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
            </SelectContent>
          </Select>
          <Input className="flex-1 h-8 text-sm" placeholder="Text/Muster (leer = alle)" value={filters.textContains} onChange={e => set('textContains', e.target.value)} />
        </div>
      </div>

      {/* Sender */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sender</Label>
        <Input className="h-8 text-sm" placeholder="Name enthält (leer = alle)" value={filters.senderNameContains} onChange={e => set('senderNameContains', e.target.value)} />
        <Input className="h-8 text-sm font-mono" placeholder="Node-IDs: !abcdef01,!12345678 (leer = alle)" value={filters.senderNodeIds} onChange={e => set('senderNodeIds', e.target.value)} />
      </div>

      {/* Signal */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Empfangswerte</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-8 text-sm" placeholder="Min SNR (dB)" type="number" value={filters.minSnr} onChange={e => set('minSnr', e.target.value)} />
          <Input className="h-8 text-sm" placeholder="Max SNR (dB)" type="number" value={filters.maxSnr} onChange={e => set('maxSnr', e.target.value)} />
          <Input className="h-8 text-sm" placeholder="Min RSSI (dBm)" type="number" value={filters.minRssi} onChange={e => set('minRssi', e.target.value)} />
          <Input className="h-8 text-sm" placeholder="Max RSSI (dBm)" type="number" value={filters.maxRssi} onChange={e => set('maxRssi', e.target.value)} />
        </div>
      </div>

      {/* Hops + Distanz */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Topologie & Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-8 text-sm" placeholder="Max Hops (leer = alle)" type="number" min="0" value={filters.maxHops} onChange={e => set('maxHops', e.target.value)} />
          <Input className="h-8 text-sm" placeholder="Max Entfernung (km)" type="number" min="0" value={filters.maxDistanceKm} onChange={e => set('maxDistanceKm', e.target.value)} />
        </div>
      </div>

      {/* Reply target */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Antwort senden an</Label>
        <Select value={filters.replyTo} onValueChange={v => set('replyTo', v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sender">Nur Sender</SelectItem>
            <SelectItem value="broadcast">Broadcast (alle)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function RuleEditor({ rule, onChange, myNode, nodes }) {
  const [previewSenderNum, setPreviewSenderNum] = useState('');

  const insertVar = (v) => {
    onChange({ ...rule, template: rule.template + v });
  };

  const previewSender = previewSenderNum
    ? nodes.find(n => String(n.num) === previewSenderNum)
    : nodes[0] || null;

  const dist = haversineKm(
    myNode?.position?.latitude, myNode?.position?.longitude,
    previewSender?.position?.latitude, previewSender?.position?.longitude
  );

  const previewText = renderTemplate(rule.template, {
    senderNode: previewSender,
    myNode,
    message: { text: 'Test', rxSnr: -5.5, rxRssi: -90, hopsAway: 1, time: new Date() },
    distKm: dist,
  });

  return (
    <Tabs defaultValue="template">
      <TabsList className="w-full">
        <TabsTrigger value="template" className="flex-1">Vorlage</TabsTrigger>
        <TabsTrigger value="filters" className="flex-1">Filter</TabsTrigger>
        <TabsTrigger value="preview" className="flex-1">Vorschau</TabsTrigger>
      </TabsList>

      <TabsContent value="template" className="space-y-4 mt-4">
        <div className="space-y-1">
          <Label className="text-xs">Nachrichtenvorlage</Label>
          <Textarea
            className="font-mono text-sm min-h-[100px]"
            value={rule.template}
            onChange={e => onChange({ ...rule, template: e.target.value })}
            placeholder="z.B. Hallo {{sender.longName}}! ..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Variablen einfügen (klicken):</Label>
          {VARIABLES.map(grp => (
            <div key={grp.group}>
              <div className="text-xs text-slate-400 mb-1">{grp.group}</div>
              <div className="flex flex-wrap gap-1">
                {grp.vars.map(v => <VariableChip key={v} v={v} onInsert={insertVar} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cooldown (Sekunden)</Label>
            <Input
              type="number" min="0" className="h-8 text-sm"
              value={rule.cooldownSeconds}
              onChange={e => onChange({ ...rule, cooldownSeconds: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="filters" className="mt-4">
        <FilterSection filters={rule.filters} onChange={f => onChange({ ...rule, filters: f })} />
      </TabsContent>

      <TabsContent value="preview" className="mt-4 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Vorschau mit Node:</Label>
          <Select value={previewSenderNum} onValueChange={setPreviewSenderNum}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Node wählen (Demo-Werte wenn leer)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Demo-Daten</SelectItem>
              {nodes.map(n => (
                <SelectItem key={n.num} value={String(n.num)}>
                  {n.user?.longName || `!${n.num?.toString(16)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-500 mb-1 font-semibold">Gerenderte Nachricht:</div>
          <p className="text-sm whitespace-pre-wrap">{previewText}</p>
        </div>
        {dist !== null && (
          <div className="text-xs text-slate-400">Entfernung zu {previewSender?.user?.longName}: {dist.toFixed(2)} km</div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function AutoresponderPage() {
  const { nodes, myNode, connected } = useMeshStore();
  const [rules, setRules] = useState(loadRules);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const selectedRule = rules.find(r => r.id === selectedId);

  const updateRules = (newRules) => {
    setRules(newRules);
    setDirty(true);
  };

  const handleSave = () => {
    saveRules(rules);
    setDirty(false);
  };

  const addRule = () => {
    const r = defaultRule();
    const newRules = [...rules, r];
    updateRules(newRules);
    setSelectedId(r.id);
  };

  const deleteRule = (id) => {
    updateRules(rules.filter(r => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleRule = (id) => {
    updateRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateSelected = (updated) => {
    updateRules(rules.map(r => r.id === updated.id ? updated : r));
  };

  const duplicateRule = (rule) => {
    const copy = { ...rule, id: Date.now().toString(), name: rule.name + ' (Kopie)', _lastTriggered: {} };
    const newRules = [...rules, copy];
    updateRules(newRules);
    setSelectedId(copy.id);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">Autoresponder</span>
        </div>
        <div className="flex items-center gap-2">
          {!connected && <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">Nicht verbunden</Badge>}
          <Button size="sm" onClick={handleSave} disabled={!dirty} className="gap-2 bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4" />
            Speichern{dirty ? ' *' : ''}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: Rule list */}
        <div className="w-72 border-r bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Regeln ({rules.length})</h3>
            <Button size="sm" variant="outline" onClick={addRule} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Neu
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rules.length === 0 && (
              <div className="text-center text-slate-400 text-sm p-6">
                Noch keine Regeln.<br />Klicke auf "Neu".
              </div>
            )}
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`px-4 py-3 border-b cursor-pointer hover:bg-slate-50 transition-colors ${selectedId === rule.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                onClick={() => setSelectedId(rule.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                      onClick={e => e.stopPropagation()}
                      className="scale-75 shrink-0"
                    />
                    <span className={`text-sm font-medium truncate ${!rule.enabled ? 'text-slate-400' : ''}`}>
                      {rule.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); duplicateRule(rule); }} className="p-1 hover:text-blue-600 text-slate-400">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteRule(rule.id); }} className="p-1 hover:text-red-500 text-slate-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate ml-8">{rule.template.slice(0, 50)}…</div>
                <div className="flex gap-1 mt-1 ml-8 flex-wrap">
                  {rule.filters.textContains && <Badge variant="outline" className="text-xs py-0">Text: "{rule.filters.textContains}"</Badge>}
                  {rule.filters.senderNameContains && <Badge variant="outline" className="text-xs py-0">Name: {rule.filters.senderNameContains}</Badge>}
                  {rule.filters.maxDistanceKm && <Badge variant="outline" className="text-xs py-0">≤{rule.filters.maxDistanceKm}km</Badge>}
                  {rule.filters.maxHops !== '' && rule.filters.maxHops !== undefined && <Badge variant="outline" className="text-xs py-0">≤{rule.filters.maxHops} Hops</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rule editor */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedRule ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Regel auswählen oder neue erstellen</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  className="font-semibold text-base h-10 flex-1"
                  value={selectedRule.name}
                  onChange={e => updateSelected({ ...selectedRule, name: e.target.value })}
                  placeholder="Regelname"
                />
                <Switch
                  checked={selectedRule.enabled}
                  onCheckedChange={() => updateSelected({ ...selectedRule, enabled: !selectedRule.enabled })}
                />
                <Label className="text-sm">{selectedRule.enabled ? 'Aktiv' : 'Deaktiviert'}</Label>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <RuleEditor
                    rule={selectedRule}
                    onChange={updateSelected}
                    myNode={myNode}
                    nodes={nodes}
                  />
                </CardContent>
              </Card>

              <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 space-y-1">
                <div className="font-semibold text-slate-500">Hinweise:</div>
                <div>• Cooldown verhindert mehrfaches Antworten auf denselben Sender (pro Node getrennt)</div>
                <div>• Die Autoresponder-Engine läuft nur während das Dashboard geöffnet ist</div>
                <div>• Entfernungsfilter erfordert GPS-Daten bei beiden Nodes</div>
                <div>• Speichere die Regeln – sie werden im Browser gespeichert (localStorage)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}