import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
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
import DisconnectedHero from '@/components/meshtastic/DisconnectedHero.jsx';
import HistoricalDashboard from '@/components/meshtastic/HistoricalDashboard.jsx';
import { distanceToMyNode } from '@/lib/meshtastic/distance.js';
import { useMeshPersistence } from '@/hooks/useMeshPersistence.js';
import { useAuth } from '@/lib/AuthContext';
import { Radio, Map, List } from 'lucide-react';

export default function Dashboard() {
  const { connected, nodes, messages, myNodeNum, myNode, metadata, isSupported } = useMeshStore();
  const { isAuthenticated } = useAuth();
  useMeshPersistence();
  const [selectedNodeNum, setSelectedNodeNum] = useState(null);
  const [search, setSearch] = useLocalStorage('dashboard.search', '');
  const [sort, setSort] = useLocalStorage('dashboard.sort', 'myFirst');
  const [filters, setFilters] = useLocalStorage('dashboard.filters', {
    active: false,
    direct: false,
    withGps: false,
    withTelemetry: false,
    withEnv: false,
    lowBattery: false,
    highBattery: false,
    near1km: false,
    near5km: false,
    near25km: false,
    messagesOnly: false,
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

    if (filters.near1km || filters.near5km || filters.near25km) {
      const d = distanceToMyNode(n, myNode);
      const limit = filters.near1km ? 1000 : filters.near5km ? 5000 : 25000;
      if (d === null || d > limit) return false;
    }

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
      const distA = distanceToMyNode(a, myNode) ?? Infinity;
      const distB = distanceToMyNode(b, myNode) ?? Infinity;
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <ConnectionBar />

      {!connected ? (
        isAuthenticated ? <HistoricalDashboard /> : <DisconnectedHero />
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
              </Tabs>
            </div>

            {/* Desktop: resizable 3-column layout */}
            <div className="hidden lg:flex h-full">
              <PanelGroup direction="horizontal" className="h-full w-full" autoSaveId="dashboard.layout.h">
                {/* Left: Node list */}
                <Panel defaultSize={22} minSize={12} maxSize={40}>
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
                <Panel defaultSize={52} minSize={30}>
                  <PanelGroup direction="vertical" className="h-full" autoSaveId="dashboard.layout.center">
                    <Panel defaultSize={45} minSize={20}>
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

                    <Panel defaultSize={55} minSize={15} className="flex flex-col">
                      <div className="flex flex-col h-full bg-card dark:bg-slate-800">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 border-b dark:border-slate-700 shrink-0 flex items-center justify-between">
                          <span>{filters.messagesOnly ? 'Empfangene Nachrichten' : 'Empfangene Pakete'}</span>
                          {filters.messagesOnly && (
                            <button
                              onClick={() => setFilters({ ...filters, messagesOnly: false })}
                              className="text-blue-500 hover:text-blue-600 font-normal"
                            >
                              Filter zurücksetzen
                            </button>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <ReceivedPacketsTable onSelectNode={setSelectedNodeNum} messagesOnly={filters.messagesOnly} />
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

                {/* Right: Node detail */}
                <Panel defaultSize={26} minSize={15} maxSize={45}>
                  <div className="border-l bg-card dark:bg-slate-900 flex flex-col h-full">
                    <div className="px-4 py-3 border-b bg-slate-50 dark:bg-slate-800 shrink-0">
                      <h3 className="font-semibold text-sm text-slate-600">
                        {selectedNode ? selectedNode.user?.longName || 'Node Detail' : 'Node auswählen'}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <NodeDetail node={selectedNode} />
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