import { useState, useRef } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import ConnectionBar from '@/components/meshtastic/ConnectionBar.jsx';
import StatsBar from '@/components/meshtastic/StatsBar.jsx';
import NodeCard from '@/components/meshtastic/NodeCard.jsx';
import NodeMap from '@/components/meshtastic/NodeMap.jsx';
import NodeDetail from '@/components/meshtastic/NodeDetail.jsx';
import MessageLog from '@/components/meshtastic/MessageLog.jsx';
import MessageInput from '@/components/meshtastic/MessageInput.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import NodeListControls from '@/components/meshtastic/NodeListControls.jsx';
import SendLog from '@/components/meshtastic/SendLog.jsx';
import { Radio, Map, MessageSquare, List } from 'lucide-react';

export default function Dashboard() {
  const { connected, nodes, messages, myNodeNum, myNode, metadata, isSupported } = useMeshStore();
  const [selectedNodeNum, setSelectedNodeNum] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('myFirst');
  const mapRef = useRef(null);

  const handleFlyTo = (lat, lng) => mapRef.current?.flyTo(lat, lng);

  const selectedNode = selectedNodeNum ? nodes.find(n => n.num === selectedNodeNum) : null;

  const filteredNodes = nodes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (n.user?.longName || '') + ' ' + (n.user?.shortName || '') + ' ' + (n.user?.id || '');
    return name.toLowerCase().includes(q);
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
    if (sort === 'hops') return (a.hopsAway ?? 999) - (b.hopsAway ?? 999);
    return 0;
  });

  return (
    <div className="h-screen flex flex-col bg-slate-100">
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
                ['💬', 'Nachrichten', 'Text-Messages im Mesh'],
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
          <StatsBar nodes={nodes} messages={messages} connected={connected} />

          <div className="flex-1 overflow-hidden">
            {/* Mobile: Tabs layout */}
            <div className="h-full lg:hidden">
              <Tabs defaultValue="map" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="map" className="flex-1 gap-1"><Map className="w-4 h-4" />Karte</TabsTrigger>
                  <TabsTrigger value="nodes" className="flex-1 gap-1"><List className="w-4 h-4" />Nodes</TabsTrigger>
                  <TabsTrigger value="detail" className="flex-1 gap-1"><Radio className="w-4 h-4" />Detail</TabsTrigger>
                  <TabsTrigger value="messages" className="flex-1 gap-1"><MessageSquare className="w-4 h-4" />Nachrichten</TabsTrigger>
                </TabsList>
                <TabsContent value="map" className="flex-1 p-4 overflow-hidden">
                  <NodeMap nodes={nodes} myNodeNum={myNodeNum} selectedNodeNum={selectedNodeNum} onSelectNode={setSelectedNodeNum} />
                </TabsContent>
                <TabsContent value="nodes" className="flex-1 overflow-auto flex flex-col p-0">
                  <NodeListControls search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
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
                  <NodeDetail node={selectedNode} onFlyTo={handleFlyTo} />
                </TabsContent>
                <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                  <div className="flex-1 overflow-auto">
                    <MessageLog messages={messages} nodes={nodes} />
                  </div>
                  <MessageInput nodes={sortedNodes} selectedNodeNum={selectedNodeNum} />
                  <SendLog />
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: resizable 3-column layout */}
            <div className="hidden lg:flex h-full">
              <PanelGroup direction="horizontal" className="h-full w-full">
                {/* Left: Node list */}
                <Panel defaultSize={20} minSize={12} maxSize={40}>
                  <div className="border-r bg-white flex flex-col h-full">
                    <div className="px-4 py-3 border-b bg-slate-50 shrink-0">
                      <h3 className="font-semibold text-sm text-slate-600">Nodes ({sortedNodes.length}/{nodes.length})</h3>
                    </div>
                    <NodeListControls search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
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

                {/* Center: Map + Messages (vertical split) */}
                <Panel defaultSize={55} minSize={30}>
                  <PanelGroup direction="vertical" className="h-full">
                    <Panel defaultSize={65} minSize={25}>
                      <div className="p-4 h-full">
                        <NodeMap
                          ref={mapRef}
                          nodes={nodes}
                          myNodeNum={myNodeNum}
                          selectedNodeNum={selectedNodeNum}
                          onSelectNode={setSelectedNodeNum}
                        />
                      </div>
                    </Panel>

                    <PanelResizeHandle className="h-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-row-resize" />

                    <Panel defaultSize={35} minSize={20}>
                      <div className="border-t bg-slate-50 flex flex-col h-full">
                        <div className="px-4 py-2 border-b bg-white shrink-0">
                          <h3 className="font-semibold text-sm text-slate-600">Nachrichten ({messages.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          <MessageLog messages={messages} nodes={nodes} />
                        </div>
                        <MessageInput nodes={sortedNodes} selectedNodeNum={selectedNodeNum} />
                        <SendLog />
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

                {/* Right: Node detail */}
                <Panel defaultSize={25} minSize={15} maxSize={45}>
                  <div className="border-l bg-white flex flex-col h-full">
                    <div className="px-4 py-3 border-b bg-slate-50 shrink-0">
                      <h3 className="font-semibold text-sm text-slate-600">
                        {selectedNode ? selectedNode.user?.longName || 'Node Detail' : 'Node auswählen'}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <NodeDetail node={selectedNode} onFlyTo={handleFlyTo} />
                    </div>
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