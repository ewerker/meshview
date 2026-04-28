import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { distanceToMyNode, formatDistance } from '@/lib/meshtastic/distance.js';

// Fix default marker icon (same as NodeMap)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function dotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [map, JSON.stringify(points)]);
  return null;
}

export default function NodePositionMiniMap({ node, myNode }) {
  const pos = node?.position;
  if (!pos?.latitude || pos.latitude === 0) return null;

  const nodeLatLng = [pos.latitude, pos.longitude];
  const myPos = myNode?.position;
  const hasMyPos = myPos?.latitude && myPos.latitude !== 0 && myNode?.num !== node?.num;
  const myLatLng = hasMyPos ? [myPos.latitude, myPos.longitude] : null;

  const distance = hasMyPos ? distanceToMyNode(node, myNode) : null;

  const points = hasMyPos ? [nodeLatLng, myLatLng] : [nodeLatLng];

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 180 }}>
        <MapContainer
          center={nodeLatLng}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <FitBounds points={points} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker position={nodeLatLng} icon={dotIcon('#ef4444')}>
            <Popup>{node.user?.longName || 'Node'}</Popup>
          </Marker>
          {hasMyPos && (
            <>
              <Marker position={myLatLng} icon={dotIcon('#22c55e')}>
                <Popup>{myNode.user?.longName || 'Mein Gerät'}</Popup>
              </Marker>
              <Polyline
                positions={[myLatLng, nodeLatLng]}
                pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 6' }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {hasMyPos && distance !== null && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 dark:text-slate-400">Abstand zu deinem Gerät</span>
          <span className="font-semibold">{formatDistance(distance)}</span>
        </div>
      )}
      {!hasMyPos && (
        <div className="text-xs text-slate-400 dark:text-slate-500 px-1">
          Keine eigene Position bekannt – Abstand nicht berechenbar
        </div>
      )}
    </div>
  );
}