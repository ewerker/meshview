import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, Wifi, MapPin, Clock, Thermometer, Droplets, Gauge, Star, Radio } from 'lucide-react';
import { HardwareModel } from '@/lib/meshtastic/constants.js';

function timeAgo(timestamp) {
  if (!timestamp) return 'Unbekannt';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

function BatteryBar({ level }) {
  if (level === undefined || level === null || level === 0) return null;
  const color = level > 60 ? 'bg-green-500' : level > 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <Battery className="w-4 h-4 text-slate-400" />
      <div className="flex-1 bg-slate-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(level, 100)}%` }} />
      </div>
      <span className="text-xs font-medium w-8">{level}%</span>
    </div>
  );
}

export default function NodeCard({ node, isMyNode, onClick, selected }) {
  const user = node.user;
  const pos = node.position;
  const dm = node.deviceMetrics;
  const em = node.environmentMetrics;

  const nodeId = user?.id || `!${node.num?.toString(16).padStart(8, '0')}`;
  const longName = user?.longName || nodeId;
  const shortName = user?.shortName || nodeId.slice(-4);
  const hwModel = HardwareModel[user?.hwModel] || 'Unbekannt';

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
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>{pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}</span>
            {pos.altitude ? <span className="text-slate-400">· {pos.altitude}m</span> : null}
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