import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Battery, MapPin, Wifi, Thermometer, Droplets, Gauge, Wind, Clock, Cpu, Radio } from 'lucide-react';
import { HardwareModel } from '@/lib/meshtastic/constants.js';
import TelemetryChart from './TelemetryChart.jsx';
import SignalChart from './SignalChart.jsx';
import NodePositionMiniMap from './NodePositionMiniMap.jsx';
import { distanceToMyNode, formatDistance } from '@/lib/meshtastic/distance.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

function Row({ label, value, unit }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium">{value}{unit ? <span className="text-slate-400 ml-1">{unit}</span> : ''}</span>
    </div>
  );
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Unbekannt';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

export default function NodeDetail({ node }) {
  const { packetLog, myNode } = useMeshStore();
  const distance = node && myNode && node.num !== myNode.num ? distanceToMyNode(node, myNode) : null;

  if (!node) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="text-center">
        <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Node aus der Liste wählen</p>
      </div>
    </div>
  );

  const user = node.user;
  const pos = node.position;
  const dm = node.deviceMetrics;
  const em = node.environmentMetrics;

  const nodeId = user?.id || `!${node.num?.toString(16).padStart(8, '0')}`;
  const longName = user?.longName || nodeId;
  const shortName = user?.shortName || nodeId.slice(-4);

  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const recentSignalData = (packetLog || [])
    .filter(p => p.from === node.num && p.time > fifteenMinsAgo)
    .map(p => ({ snr: p.rxSnr, rssi: p.rxRssi }))
    .filter(p => p.snr !== undefined || p.rssi !== undefined)
    .slice(-20);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 border-b bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{longName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">{shortName}</Badge>
              <span className="text-xs text-slate-400 font-mono">{nodeId}</span>
            </div>
          </div>
          {dm?.batteryLevel > 0 && (() => {
            const isPowered = dm.batteryLevel > 100;
            const display = Math.min(dm.batteryLevel, 100);
            const colorClass = isPowered ? 'text-blue-600' : display > 60 ? 'text-green-600' : display > 30 ? 'text-yellow-600' : 'text-red-600';
            return (
              <div className="text-center">
                <div className={`text-2xl font-bold ${colorClass}`}>
                  {display}%{isPowered && <span className="ml-1">⚡</span>}
                </div>
                <div className="text-xs text-slate-400">{isPowered ? 'Netzbetrieb' : 'Akku'}</div>
              </div>
            );
          })()}
        </div>
      </div>

      <Tabs defaultValue="info" className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
          <TabsTrigger value="signal" className="flex-1">Signal</TabsTrigger>
          <TabsTrigger value="position" className="flex-1">Position</TabsTrigger>
          <TabsTrigger value="telemetry" className="flex-1">Telemetrie</TabsTrigger>
          <TabsTrigger value="env" className="flex-1">Umgebung</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Geräteinformationen</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              <Row label="Hardware" value={HardwareModel[user?.hwModel] || 'Unbekannt'} />
              <Row label="Node-Nummer" value={node.num?.toString(16).padStart(8, '0')} />
              <Row label="Node-ID" value={nodeId} />
              <Row label="Kanal" value={node.channel} />
              <Row label="Hops" value={node.hopsAway !== undefined ? (node.hopsAway === 0 ? 'Direkt' : `${node.hopsAway} Hop(s)`) : null} />
              <Row label="Via MQTT" value={node.viaMqtt ? 'Ja' : 'Nein'} />
              <Row label="Lizenziert" value={user?.isLicensed ? 'Ja' : 'Nein'} />
              <Row label="Zuletzt gehört" value={timeAgo(node.lastHeard)} />
            </CardContent>
          </Card>

          {dm && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gerätemetriken</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <Row label="Akku" value={dm.batteryLevel > 0 ? `${Math.min(dm.batteryLevel, 100)}${dm.batteryLevel > 100 ? ' ⚡ (Netzbetrieb)' : ''}` : null} unit={dm.batteryLevel > 0 && dm.batteryLevel <= 100 ? '%' : (dm.batteryLevel > 100 ? '%' : null)} />
                <Row label="Spannung" value={dm.voltage > 0 ? dm.voltage.toFixed(2) : null} unit="V" />
                <Row label="Kanal-Auslastung" value={dm.channelUtilization > 0 ? dm.channelUtilization.toFixed(1) : null} unit="%" />
                <Row label="TX Air-Zeit" value={dm.airUtilTx > 0 ? dm.airUtilTx.toFixed(1) : null} unit="%" />
                <Row label="Uptime" value={dm.uptimeSeconds > 0 ? `${Math.floor(dm.uptimeSeconds / 3600)}h ${Math.floor((dm.uptimeSeconds % 3600) / 60)}min` : null} />
                <Row label="Pakete TX" value={dm.numPacketsTx > 0 ? dm.numPacketsTx : null} />
                <Row label="Pakete RX" value={dm.numPacketsRx > 0 ? dm.numPacketsRx : null} />
                <Row label="Online Nodes" value={dm.numOnlineNodes > 0 ? dm.numOnlineNodes : null} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="signal" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Aktuelle Werte</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              <Row label="SNR" value={node.snr !== undefined && node.snr !== null ? node.snr.toFixed(1) : null} unit="dB" />
              <Row label="RSSI" value={node.rssi} unit="dBm" />
              <Row label="Hops" value={node.hopsAway !== undefined ? (node.hopsAway === 0 ? 'Direkt' : `${node.hopsAway} Hop(s)`) : null} />
              <Row label="Via MQTT" value={node.viaMqtt ? 'Ja' : 'Nein'} />
              <Row label="Kanal" value={node.channel} />
            </CardContent>
          </Card>
          {recentSignalData.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Verlauf (letzte 15 Min)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 h-16">
                  <div className="flex-1 h-full" title="SNR Verlauf">
                    <div className="text-[10px] text-slate-400 mb-1">SNR (dB)</div>
                    <ResponsiveContainer width="100%" height="80%">
                      <LineChart data={recentSignalData}>
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                        <Line type="monotone" dataKey="snr" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 h-full" title="RSSI Verlauf">
                    <div className="text-[10px] text-slate-400 mb-1">RSSI (dBm)</div>
                    <ResponsiveContainer width="100%" height="80%">
                      <LineChart data={recentSignalData}>
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                        <Line type="monotone" dataKey="rssi" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <SignalChart node={node} packetLog={packetLog} />
        </TabsContent>

        <TabsContent value="position" className="mt-4 space-y-4">
          {pos?.latitude && pos.latitude !== 0 ? (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Karte</CardTitle></CardHeader>
                <CardContent>
                  <NodePositionMiniMap node={node} myNode={myNode} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">GPS-Position</CardTitle></CardHeader>
                <CardContent className="space-y-0">
                  <Row label="Breitengrad" value={pos.latitude.toFixed(6)} unit="°" />
                  <Row label="Längengrad" value={pos.longitude.toFixed(6)} unit="°" />
                  <Row label="Höhe (MSL)" value={pos.altitude !== 0 ? pos.altitude : null} unit="m" />
                  <Row label="Höhe (HAE)" value={pos.altitudeHae !== 0 ? pos.altitudeHae : null} unit="m" />
                  <Row label="Abstand (eigenes Gerät)" value={formatDistance(distance)} />
                  <Row label="Satelliten" value={pos.numSatellites > 0 ? pos.numSatellites : null} />
                  <Row label="PDOP" value={pos.pdop > 0 ? (pos.pdop / 100).toFixed(2) : null} />
                  <Row label="HDOP" value={pos.hdop > 0 ? (pos.hdop / 100).toFixed(2) : null} />
                  <Row label="Geschwindigkeit" value={pos.groundSpeed > 0 ? pos.groundSpeed : null} unit="m/s" />
                  <Row label="Kurs" value={pos.groundTrack > 0 ? `${(pos.groundTrack / 100000).toFixed(0)}°` : null} />
                  {pos.time > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-slate-500">GPS-Zeit</span>
                      <span className="text-sm font-medium">{format(new Date(pos.time * 1000), 'dd.MM.yyyy HH:mm:ss', { locale: de })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine GPS-Position vorhanden</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="telemetry" className="mt-4">
          <TelemetryChart node={node} />
        </TabsContent>

        <TabsContent value="env" className="mt-4">
          {em ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Umgebungssensoren</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <Row label="Temperatur" value={em.temperature !== null ? em.temperature?.toFixed(1) : null} unit="°C" />
                <Row label="Luftfeuchtigkeit" value={em.relativeHumidity !== null ? em.relativeHumidity?.toFixed(0) : null} unit="%" />
                <Row label="Luftdruck" value={em.barometricPressure !== null ? em.barometricPressure?.toFixed(1) : null} unit="hPa" />
                <Row label="Gaswiederstand" value={em.gasResistance !== null ? em.gasResistance?.toFixed(0) : null} unit="Ω" />
                <Row label="IAQ" value={em.iaq} />
                <Row label="Spannung" value={em.voltage !== null ? em.voltage?.toFixed(2) : null} unit="V" />
                <Row label="Strom" value={em.current !== null ? em.current?.toFixed(0) : null} unit="mA" />
                <Row label="Lux" value={em.lux !== null ? em.lux?.toFixed(0) : null} unit="lx" />
                <Row label="Windrichtung" value={em.windDirection !== null ? em.windDirection?.toFixed(0) : null} unit="°" />
                <Row label="Windgeschwindigkeit" value={em.windSpeed !== null ? em.windSpeed?.toFixed(1) : null} unit="m/s" />
                <Row label="Windböe" value={em.windGust !== null ? em.windGust?.toFixed(1) : null} unit="m/s" />
                <Row label="Gewicht" value={em.weight !== null ? em.weight?.toFixed(0) : null} unit="g" />
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <div className="text-center">
                <Thermometer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine Umgebungsdaten vorhanden</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}