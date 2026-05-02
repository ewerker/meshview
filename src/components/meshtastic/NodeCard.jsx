import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, Wifi, MapPin, Clock, Thermometer, Droplets, Gauge, Star, Radio, Ruler, Plug } from 'lucide-react';
import { HardwareModel } from '@/lib/meshtastic/constants.js';
import { distanceToMyNode, formatDistance } from '@/lib/meshtastic/distance.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';

function timeAgo(timestamp) {
  if (!timestamp) return 'Unbekannt';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

function formatAbsoluteTime(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function BatteryBar({ level }) {
  if (level === undefined || level === null || level === 0) return null;
  const isPowered = level > 100;
  const display = Math.min(level, 100);
  const color = isPowered ? 'bg-blue-500' : display > 60 ? 'bg-green-500' : display > 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      {isPowered ? <Plug className="w-4 h-4 text-blue-500" /> : <Battery className="w-4 h-4 text-slate-400" />}
      <div className="flex-1 bg-slate-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${display}%` }} />
      </div>
      <span className="text-xs font-medium w-auto whitespace-nowrap">
        {display}%{isPowered && <span className="text-blue-500 ml-1">⚡</span>}
      </span>
    </div>
  );
}

export default function NodeCard({ node, isMyNode, onClick, selected }) {
  const { myNode, metadata } = useMeshStore();
  const user = node.user;
  const pos = node.position;
  const dm = node.deviceMetrics;
  const em = node.environmentMetrics;
  const distance = !isMyNode ? distanceToMyNode(node, myNode) : null;

  const nodeId = `!${node.num?.toString(16).padStart(8, '0')}`;
  const longName = user?.longName || node.long_name || nodeId;
  const shortName = user?.shortName || node.short_name || nodeId.slice(-4);
  
  const effectiveHwModel = (user?.hwModel && user.hwModel !== 0) ? user.hwModel : (isMyNode && metadata?.hwModel ? metadata.hwModel : user?.hwModel);
  const hwModel = effectiveHwModel ? (HardwareModel[effectiveHwModel] || `Unbekannt (${effectiveHwModel})`) : 'Unbekannt';

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md bg-card dark:bg-slate-800 ${selected ? 'ring-2 ring-blue-500' : ''} ${isMyNode ? 'border-green-400' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {isMyNode && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
              {longName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-mono">{shortName}</Badge>
              <span className="text-xs text-slate-400 font-mono">{nodeId}</span>
            </div>
          </div>
          <div className="text-right">
            {node.hopsAway !== undefined && node.hopsAway !== null && (
              <Badge variant={node.hopsAway === 0 ? 'default' : 'secondary'} className="text-xs">
                {node.hopsAway === 0 ? 'Direkt' : `${node.hopsAway} Hop${node.hopsAway > 1 ? 's' : ''}`}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-slate-500">{hwModel}</div>

        {/* Signal */}
        {(node.snr !== undefined || node.rssi !== undefined) && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-blue-500" />
              <span>SNR: <strong>{node.snr?.toFixed(1) ?? '-'} dB</strong></span>
            </div>
            {node.rssi && (
              <span>RSSI: <strong>{node.rssi} dBm</strong></span>
            )}
          </div>
        )}

        {/* Battery */}
        {dm?.batteryLevel > 0 && <BatteryBar level={dm.batteryLevel} />}
        {dm?.voltage > 0 && (
          <div className="text-xs text-slate-500">{dm.voltage.toFixed(2)}V</div>
        )}

        {/* Position */}
        {pos?.latitude !== 0 && pos?.longitude !== 0 && pos?.latitude && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>{pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}</span>
            {pos.altitude ? <span className="text-slate-400">· {pos.altitude}m</span> : null}
            {distance !== null && (
              <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 ml-1">
                <Ruler className="w-3 h-3" />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        )}

        {/* Environment */}
        {em && (
          <div className="flex flex-wrap gap-2 text-xs">
            {em.temperature !== null && em.temperature !== undefined && (
              <div className="flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-orange-500" />
                <span>{em.temperature.toFixed(1)}°C</span>
              </div>
            )}
            {em.relativeHumidity !== null && em.relativeHumidity !== undefined && (
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span>{em.relativeHumidity.toFixed(0)}%</span>
              </div>
            )}
            {em.barometricPressure !== null && em.barometricPressure !== undefined && (
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-purple-500" />
                <span>{em.barometricPressure.toFixed(0)} hPa</span>
              </div>
            )}
          </div>
        )}

        {/* Last heard */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(node.lastHeard)}</span>
          {node.lastHeard && (
            <span className="text-slate-300 dark:text-slate-500">· {formatAbsoluteTime(node.lastHeard)}</span>
          )}
        </div>

        {/* Channel util */}
        {dm?.channelUtilization > 0 && (
          <div className="text-xs text-slate-400">
            Kanal-Auslastung: {dm.channelUtilization.toFixed(1)}% · TX: {dm.airUtilTx?.toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}