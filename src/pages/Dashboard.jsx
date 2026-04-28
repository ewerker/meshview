import { useState } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import ConnectionBar from '@/components/meshtastic/ConnectionBar.jsx';
import StatsBar from '@/components/meshtastic/StatsBar.jsx';
import NodeCard from '@/components/meshtastic/NodeCard.jsx';
import NodeMap from '@/components/meshtastic/NodeMap.jsx';
import NodeDetail from '@/components/meshtastic/NodeDetail.jsx';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import NodeListControls from '@/components/meshtastic/NodeListControls.jsx';
import SerialLog from '@/components/meshtastic/SerialLog.jsx';
import ReceivedPacketsTable from '@/components/meshtastic/ReceivedPacketsTable.jsx';
import MessageInput from '@/components/meshtastic/MessageInput.jsx';
import { Radio, Map, List, Send } from 'lucide-react';

export default function Dashboard() {
  const { connected, nodes, messages, myNodeNum, myNode, metadata, isSupported } = useMeshStore();
  const [selectedNodeNum, setSelectedNodeNum] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('myFirst');
  const [filters, setFilters] = useState({
    active: false,
    direct: false,
    withGps: false,
    withTelemetry: false,
    withEnv: false,
    lowBattery: false,
    highBattery: false,
  });

  const selectedNode = selectedNodeNum ? nodes.find(n => n.num === selectedNodeNum) : null;

  const now = Math.floor(Date.now() / 1000);

  const filteredNodes = nodes.filter(n => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (n.user?.longName || '') + ' ' + (n.user?.shortName || '') + ' ' + (n.user?.id || '');
      if (!name.toLowerCase().includes(q)) return false;
    }

    // Additive filters - all active filters must match
    if (filters.active && (now - (n.lastHeard || 0)) >= 900) return false;
    if (filters.direct && n.hopsAway !== 0) return false;
    if (filters.withGps && (!n.position?.latitude || !n.position?.longitude || n.position.latitude === 0)) return false;
    if (filters.withTelemetry && !n.deviceMetrics) return false;
    if (filters.withEnv && !n.environmentMetrics) return false;
    if (filters.lowBattery && !(n.deviceMetrics?.batteryLevel > 0 && n.deviceMetrics.batteryLevel < 20)) return false;
    if (filters.highBattery && !(n.deviceMetrics?.batteryLevel > 60)) return false;

    return true;
  });

  const sortedNodes = [...filteredNodes].sort((a, b) => {
    if (sort === 'myFirst') {
      if (a.num === myNodeNum) return -1;
      if (b.num === myNodeNum) return 1;
      return (b.lastHeard || 0) - (a.lastHeard || 0);
    }
    if (sort === 'lastHeard') return (b.lastHeard || 0) - (a.lastHeard || 0);
    if (sort === 'name') return (a.user?.longName || '').localeCompare(b.user?.longName || '');
    if (sort === 'snr') return (b.snr ?? -999) - (a.snr ?? -999);
    if (sort === 'battery') return (b.deviceMetrics?.batteryLevel ?? -1) - (a.deviceMetrics?.batteryLevel ?? -1);
    if (sort === 'distance') {
      const distA = myNode?.position && a.position?.latitude ? 
        Math.sqrt(Math.pow(a.position.latitude - myNode.position.latitude, 2) + Math.pow(a.position.longitude - myNode.position.longitude, 2)) : Infinity;
      const distB = myNode?.position && b.position?.latitude ? 
        Math.sqrt(Math.pow(b.position.latitude - myNode.position.latitude, 2) + Math.pow(b.position.longitude - myNode.position.longitude, 2)) : Infinity;
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <ConnectionBar />

      {!connected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-3">Meshtastic Dashboard</h2>
            <p className="text-slate-500 mb-6">
              Verbinde dein Meshtastic-Gerät per USB und klicke auf "Mit Gerät verbinden".
            </p>
            {!isSupported && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                ⚠️ Dein Browser unterstützt die Web Serial API nicht.<br />
                Bitte <strong>Google Chrome</strong> oder <strong>Microsoft Edge</strong> verwenden.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-6 text-left">
              {[
                ['📡', 'Node-Informationen', 'Namen, IDs, Hardware'],
                ['🗺️', 'GPS-Karte', 'Alle Positionen visualisiert'],
                ['📊', 'Telemetrie', 'Akku, Signal, Uptime'],
                ['🌡️', 'Umgebung', 'Temp., Luftdruck, Feuchte'],
                ['📶', 'Signal', 'SNR, RSSI, Hops'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="bg-white rounded-lg p-3 border">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <StatsBar nodes={nodes} messages={messages} connected={connected} filters={filters} onFiltersChange={setFilters} />

          <div className="flex-1 overflow-hidden">
            {/* Mobile: Tabs layout */}
            <div className="h-full lg:hidden">
              <Tabs defaultValue="map" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="map" className="flex-1 gap-1"><Map className="w-4 h-4" />Karte</TabsTrigger>
                  <TabsTrigger value="nodes" className="flex-1 gap-1"><List className="w-4 h-4" />Nodes</TabsTrigger>
                  <TabsTrigger value="detail" className="flex-1 gap-1"><Radio className="w-4 h-4" />Detail</TabsTrigger>
                  <TabsTrigger value="send" className="flex-1 gap-1"><Send className="w-4 h-4" />Senden</TabsTrigger>
                </TabsList>
                <TabsContent value="map" className="flex-1 p-4 overflow-hidden">
                  <NodeMap nodes={nodes} myNodeNum={myNodeNum} selectedNodeNum={selectedNodeNum} onSelectNode={setSelectedNodeNum} />
                </TabsContent>
                <TabsContent value="nodes" className="flex-1 overflow-auto flex flex-col p-0">
                  <NodeListControls search={search} onSearch={setSearch} sort={sort} onSort={setSort} filters={filters} onFiltersChange={setFilters} />
                    <div className="flex-1 overflow-auto p-4 grid gap-3">
                    {sortedNodes.map(node => (
                      <NodeCard
                        key={node.num}
                        node={node}
                        isMyNode={node.num === myNodeNum}
                        selected={node.num === selectedNodeNum}
                        onClick={() => setSelectedNodeNum(node.num)}
                      />
                    ))}
                    {sortedNodes.length === 0 && (
                      <div className="text-center text-slate-400 text-sm py-6">Keine Nodes gefunden</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="detail" className="flex-1 overflow-auto">
                  <NodeDetail node={selectedNode} />
                </TabsContent>
                <TabsContent value="send" className="flex-1 overflow-auto">
                  <MessageInput selectedNodeNum={selectedNodeNum} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: resizable 3-column layout */}
            <div className="hidden lg:flex h-full">
              <PanelGroup direction="horizontal" className="h-full w-full">
                {/* Left: Node list */}
                <Panel defaultSize={20} minSize={12} maxSize={40}>
                  <div className="border-r bg-card dark:bg-slate-900 flex flex-col h-full">
                    <div className="px-4 py-3 border-b bg-slate-50 dark:bg-slate-800 shrink-0">
                      <h3 className="font-semibold text-sm text-slate-600">Nodes ({sortedNodes.length}/{nodes.length})</h3>
                    </div>
                    <NodeListControls search={search} onSearch={setSearch} sort={sort} onSort={setSort} filters={filters} onFiltersChange={setFilters} />
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="p-3 space-y-2">
                        {sortedNodes.map(node => (
                          <NodeCard
                            key={node.num}
                            node={node}
                            isMyNode={node.num === myNodeNum}
                            selected={node.num === selectedNodeNum}
                            onClick={() => setSelectedNodeNum(node.num)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

                {/* Center: Map + Serial Log + Packets Table */}
                <Panel defaultSize={55} minSize={30}>
                  <PanelGroup direction="vertical" className="h-full">
                    <Panel defaultSize={60} minSize={20}>
                      <div className="h-full p-4 overflow-hidden">
                        <NodeMap
                          nodes={nodes}
                          myNodeNum={myNodeNum}
                          selectedNodeNum={selectedNodeNum}
                          onSelectNode={setSelectedNodeNum}
                        />
                      </div>
                    </Panel>

                    <PanelResizeHandle className="h-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-row-resize" />

                    <Panel defaultSize={40} minSize={15} className="flex flex-col">
                      <div className="flex flex-col h-full bg-card dark:bg-slate-800">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 border-b dark:border-slate-700 shrink-0">
                          Empfangene Pakete
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <ReceivedPacketsTable />
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

                {/* Right: Node detail + Admin tabs */}
                <Panel defaultSize={25} minSize={15} maxSize={45}>
                  <div className="border-l bg-card dark:bg-slate-900 flex flex-col h-full">
                    <Tabs defaultValue="detail" className="flex flex-col h-full">
                      <div className="px-3 py-2 border-b bg-slate-50 dark:bg-slate-800 shrink-0">
                        <TabsList className="w-full">
                          <TabsTrigger value="detail" className="flex-1 gap-1 text-xs"><Radio className="w-3.5 h-3.5" />Detail</TabsTrigger>
                          <TabsTrigger value="send" className="flex-1 gap-1 text-xs"><Send className="w-3.5 h-3.5" />Senden</TabsTrigger>
                        </TabsList>
                      </div>
                      <TabsContent value="detail" className="flex-1 overflow-hidden mt-0">
                        <NodeDetail node={selectedNode} />
                      </TabsContent>
                      <TabsContent value="send" className="flex-1 overflow-auto mt-0">
                        <MessageInput selectedNodeNum={selectedNodeNum} />
                      </TabsContent>
                    </Tabs>
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </>
      )}
    </div>
  );
}