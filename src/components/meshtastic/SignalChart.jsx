import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function SignalChart({ node, packetLog }) {
  if (!node) return null;

  // Filter packets from this node (last 50, last 2 hours)
  const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
  const relevantPackets = (packetLog || [])
    .filter(p => p.from === node.num && p.rxSnr !== undefined && p.time > twoHoursAgo)
    .slice(-50);

  if (relevantPackets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border text-slate-400">
        <div className="text-center">
          <p className="text-sm">Keine Signaldaten für die letzten 2 Stunden</p>
        </div>
      </div>
    );
  }

  // Prepare data
  const data = relevantPackets.map(p => ({
    time: format(new Date(p.time * 1000), 'HH:mm'),
    snr: p.rxSnr ? parseFloat(p.rxSnr.toFixed(1)) : null,
    rssi: p.rxRssi || null,
  }));

  return (
    <div className="space-y-4">
      {/* SNR Chart */}
      <div className="bg-white border rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-600 mb-2">SNR-Verlauf (dB)</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              domain={['dataMin - 2', 'dataMax + 2']}
              width={35}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff' }}
              formatter={(value) => (value !== null ? value.toFixed(1) : '-')}
              labelStyle={{ color: '#fff' }}
              cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="snr"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RSSI Chart */}
      <div className="bg-white border rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-600 mb-2">RSSI-Verlauf (dBm)</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              domain={['dataMin - 5', 'dataMax + 5']}
              width={35}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff' }}
              formatter={(value) => (value !== null ? value : '-')}
              labelStyle={{ color: '#fff' }}
              cursor={{ stroke: '#f97316', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="rssi"
              stroke="#f97316"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-2">
        {relevantPackets.length} Datenpunkt{relevantPackets.length !== 1 ? 'e' : ''} in den letzten 2 Stunden
      </div>
    </div>
  );
}