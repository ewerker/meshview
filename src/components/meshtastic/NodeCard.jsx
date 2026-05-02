import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, Wifi, MapPin, Clock, Thermometer, Droplets, Gauge, Star, Radio, Ruler, Plug, Activity } from 'lucide-react';
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

function MetricBar({ icon: Icon, label, value, min, max, unit, colorClass, formatter }) {
  if (value === undefined || value === null) return null;
  let percentage = ((value - min) / (max - min)) * 100;
  percentage = Math.max(0, Math.min(100, percentage));
  const displayValue = formatter ? formatter(value) : value;
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-12 flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0">
        {Icon && <Icon className="w-3 h-3" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden flex shrink-0">
        <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="w-14 text-right font-medium text-slate-600 dark:text-slate-300 shrink-0">
        {displayValue}{unit}
      </div>
    </div>
  );
}

function FreshnessBar({ timestamp }) {
  if (!timestamp) return null;
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  const maxAge = 86400; 
  let percentage = Math.max(0, 100 - (diff / maxAge) * 100);
  
  let color = 'bg-red-500';
  if (diff < 3600) color = 'bg-green-500';
  else if (diff < 43200) color = 'bg-yellow-500';
  else if (diff < 86400) color = 'bg-orange-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-12 flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0">
        <Clock className="w-3 h-3" />
        <span>Zeit</span>
      </div>
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden flex shrink-0">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="w-14 text-right font-medium text-slate-600 dark:text-slate-300 shrink-0 truncate" title={formatAbsoluteTime(timestamp)}>
        {timeAgo(timestamp)}
      </div>
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
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{hwModel}</span>
          {/* Battery & Voltage - Dezent */}
          {(dm?.batteryLevel > 0 || dm?.voltage > 0) && (
            <div className="flex items-center gap-2">
              {dm?.batteryLevel > 0 && (
                <span className="flex items-center gap-1">
                  {dm.batteryLevel > 100 ? <Plug className="w-3 h-3 text-blue-500" /> : <Battery className="w-3 h-3" />}
                  {Math.min(dm.batteryLevel, 100)}%{dm.batteryLevel > 100 && '⚡'}
                </span>
              )}
              {dm?.voltage > 0 && <span>{dm.voltage.toFixed(2)}V</span>}
            </div>
          )}
        </div>

        {/* Metrics Bars */}
        <div className="space-y-1.5">
          <MetricBar 
            icon={Wifi} 
            label="SNR" 
            value={node.snr} 
            min={-20} max={15} 
            unit=" dB" 
            colorClass="bg-blue-500" 
            formatter={(v) => v.toFixed(1)} 
          />
          <MetricBar 
            icon={Radio} 
            label="RSSI" 
            value={node.rssi} 
            min={-130} max={-40} 
            unit=" dBm" 
            colorClass="bg-orange-500" 
          />
          <MetricBar 
            icon={Activity} 
            label="Kanal" 
            value={dm?.channelUtilization} 
            min={0} max={100} 
            unit="%" 
            colorClass="bg-purple-500" 
            formatter={(v) => v.toFixed(1)} 
          />
          <FreshnessBar timestamp={node.lastHeard} />
        </div>

        {/* Position */}
        {pos?.latitude !== 0 && pos?.longitude !== 0 && pos?.latitude && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 flex-wrap pt-1">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>{pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}</span>
            {pos.altitude ? (
              <span className={pos.altitude > 200 ? "text-green-500 font-medium" : "text-slate-400"}>
                · {pos.altitude}m
              </span>
            ) : null}
            {distance !== null && (
              <span className={`flex items-center gap-0.5 ml-1 ${distance > 10000 ? 'text-red-500 font-medium' : distance > 5000 ? 'text-yellow-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                <Ruler className="w-3 h-3" />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        )}

        {/* Environment */}
        {em && (
          <div className="flex flex-wrap gap-2 text-xs pt-1">
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
      </CardContent>
    </Card>
  );
}