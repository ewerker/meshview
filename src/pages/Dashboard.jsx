import { useState } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import ConnectionBar from '@/components/meshtastic/ConnectionBar.jsx';
import StatsBar from '@/components/meshtastic/StatsBar.jsx';
import NodeCard from '@/components/meshtastic/NodeCard.jsx';
import NodeMap from '@/components/meshtastic/NodeMap.jsx';
import NodeDetail from '@/components/meshtastic/NodeDetail.jsx';
import MessageLog from '@/components/meshtastic/MessageLog.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Radio, Map, MessageSquare, List } from 'lucide-react';

export default function Dashboard() {
  const { connected, nodes, messages, myNodeNum, myNode, metadata, isSupported } = useMeshStore();
  const [selectedNodeNum, setSelectedNodeNum] = useState(null);

  const selectedNode = selectedNodeNum ? nodes.find(n => n.num === selectedNodeNum) : null;

  // Sort nodes: my node first, then by last heard
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.num === myNodeNum) return -1;
    if (b.num === myNodeNum) return 1;
    return (b.lastHeard || 0) - (a.lastHeard || 0);
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
                <TabsContent value="nodes" className="flex-1 overflow-auto p-4">
                  <div className="grid gap-3">
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
                </TabsContent>
                <TabsContent value="detail" className="flex-1 overflow-auto">
                  <NodeDetail node={selectedNode} />
                </TabsContent>
                <TabsContent value="messages" className="flex-1 overflow-auto bg-slate-50">
                  <MessageLog messages={messages} nodes={nodes} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: 3-column layout */}
            <div className="hidden lg:grid lg:grid-cols-[280px_1fr_320px] h-full gap-0">
              {/* Left: Node list */}
              <div className="border-r bg-white flex flex-col">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <h3 className="font-semibold text-sm text-slate-600">Nodes ({nodes.length})</h3>
                </div>
                <ScrollArea className="flex-1">
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
                </ScrollArea>
              </div>

              {/* Center: Map + Messages */}
              <div className="flex flex-col overflow-hidden">
                <div className="flex-1 p-4 min-h-0">
                  <NodeMap
                    nodes={nodes}
                    myNodeNum={myNodeNum}
                    selectedNodeNum={selectedNodeNum}
                    onSelectNode={setSelectedNodeNum}
                  />
                </div>
                <div className="h-48 border-t bg-slate-50 flex flex-col">
                  <div className="px-4 py-2 border-b bg-white">
                    <h3 className="font-semibold text-sm text-slate-600">Nachrichten ({messages.length})</h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <MessageLog messages={messages} nodes={nodes} />
                  </ScrollArea>
                </div>
              </div>

              {/* Right: Node detail */}
              <div className="border-l bg-white flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <h3 className="font-semibold text-sm text-slate-600">
                    {selectedNode ? selectedNode.user?.longName || 'Node Detail' : 'Node auswählen'}
                  </h3>
                </div>
                <div className="flex-1 overflow-hidden">
                  <NodeDetail node={selectedNode} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}