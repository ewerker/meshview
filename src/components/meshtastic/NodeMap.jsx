import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createNodeIcon(shortName, isMyNode, isSelected) {
  const color = isMyNode ? '#16a34a' : isSelected ? '#2563eb' : '#64748b';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="23" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="monospace">${(shortName || '?').slice(0, 4)}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function AutoFitBounds({ nodes }) {
  const map = useMap();
  useEffect(() => {
    const validNodes = nodes.filter(n => n.position?.latitude && n.position?.longitude && n.position.latitude !== 0);
    if (validNodes.length === 0) return;
    if (validNodes.length === 1) {
      map.setView([validNodes[0].position.latitude, validNodes[0].position.longitude], 13);
      return;
    }
    const bounds = validNodes.map(n => [n.position.latitude, n.position.longitude]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [nodes.length]);
  return null;
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Unbekannt';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

export default function NodeMap({ nodes, myNodeNum, selectedNodeNum, onSelectNode }) {
  const nodesWithPos = nodes.filter(n =>
    n.position?.latitude && n.position?.longitude &&
    n.position.latitude !== 0 && n.position.longitude !== 0
  );

  const center = nodesWithPos.length > 0
    ? [nodesWithPos[0].position.latitude, nodesWithPos[0].position.longitude]
    : [48.1351, 11.5820]; // Default: Munich

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={nodesWithPos.length > 0 ? 13 : 6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFitBounds nodes={nodesWithPos} />

        {nodesWithPos.map(node => {
          const isMyNode = node.num === myNodeNum;
          const isSelected = node.num === selectedNodeNum;
          const shortName = node.user?.shortName || node.num?.toString(16).slice(-4).toUpperCase();
          const longName = node.user?.longName || `Node ${node.num?.toString(16)}`;

          return (
            <Marker
              key={`${node.num}-${node.user?.id || ''}-${node.position.latitude}-${node.position.longitude}`}
              position={[node.position.latitude, node.position.longitude]}
              icon={createNodeIcon(shortName, isMyNode, isSelected)}
              eventHandlers={{ click: () => onSelectNode && onSelectNode(node.num) }}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <div className="font-bold text-base">{longName}</div>
                  <div className="text-slate-500 font-mono text-xs">{node.user?.id || ''}</div>
                  <hr className="my-1" />
                  <div>📍 {node.position.latitude.toFixed(5)}, {node.position.longitude.toFixed(5)}</div>
                  {node.position.altitude ? <div>⛰️ {node.position.altitude}m</div> : null}
                  {node.deviceMetrics?.batteryLevel > 0 && (
                    <div>🔋 {node.deviceMetrics.batteryLevel}%</div>
                  )}
                  {node.snr !== undefined && <div>📶 SNR: {node.snr?.toFixed(1)} dB</div>}
                  {node.rssi && <div>📡 RSSI: {node.rssi} dBm</div>}
                  <div>🕐 {timeAgo(node.lastHeard)}</div>
                  {isMyNode && <div className="text-green-600 font-semibold mt-1">⭐ Mein Gerät</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}