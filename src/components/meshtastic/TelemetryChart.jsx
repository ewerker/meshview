import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

function formatTime(timestamp) {
  if (!timestamp) return '';
  return format(new Date(timestamp * 1000), 'HH:mm');
}

export default function TelemetryChart({ node }) {
  const history = node?.telemetryHistory || [];

  const deviceData = history
    .filter(t => t.deviceMetrics)
    .map(t => ({
      time: formatTime(t.time),
      Batterie: t.deviceMetrics.batteryLevel || null,
      Spannung: t.deviceMetrics.voltage ? +t.deviceMetrics.voltage.toFixed(2) : null,
      Kanal: t.deviceMetrics.channelUtilization ? +t.deviceMetrics.channelUtilization.toFixed(1) : null,
      TX: t.deviceMetrics.airUtilTx ? +t.deviceMetrics.airUtilTx.toFixed(1) : null,
    }))
    .reverse();

  const envData = history
    .filter(t => t.environmentMetrics)
    .map(t => ({
      time: formatTime(t.time),
      Temperatur: t.environmentMetrics.temperature ? +t.environmentMetrics.temperature.toFixed(1) : null,
      Luftfeuchtigkeit: t.environmentMetrics.relativeHumidity ? +t.environmentMetrics.relativeHumidity.toFixed(0) : null,
      Luftdruck: t.environmentMetrics.barometricPressure ? +t.environmentMetrics.barometricPressure.toFixed(0) : null,
    }))
    .reverse();

  if (deviceData.length === 0 && envData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Noch keine Telemetrie-Daten empfangen
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {deviceData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Gerätemetriken</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Batterie" stroke="#22c55e" dot={false} strokeWidth={2} unit="%" />
              <Line type="monotone" dataKey="Kanal" stroke="#3b82f6" dot={false} strokeWidth={2} unit="%" />
              <Line type="monotone" dataKey="TX" stroke="#f59e0b" dot={false} strokeWidth={2} unit="%" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {envData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Umgebungsmetriken</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={envData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {envData.some(d => d.Temperatur !== null) && (
                <Line type="monotone" dataKey="Temperatur" stroke="#ef4444" dot={false} strokeWidth={2} unit="°C" />
              )}
              {envData.some(d => d.Luftfeuchtigkeit !== null) && (
                <Line type="monotone" dataKey="Luftfeuchtigkeit" stroke="#06b6d4" dot={false} strokeWidth={2} unit="%" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}