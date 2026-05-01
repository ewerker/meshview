import { useMemo } from 'react';
import { Settings, Wifi, Bluetooth, Cloud, RefreshCw, CheckCircle2, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMeshStore } from '@/hooks/useMeshStore.js';

const SECTIONS = [
  {
    name: 'MQTT',
    icon: Cloud,
    fields: [
      ['enabled', 'Aktiv'],
      ['address', 'Server'],
      ['username', 'Benutzer'],
      ['rootTopic', 'Root Topic'],
      ['encryptionEnabled', 'Verschlüsselung'],
      ['jsonEnabled', 'JSON'],
      ['tlsEnabled', 'TLS'],
      ['proxyToClientEnabled', 'Proxy zum Client'],
    ],
  },
  {
    name: 'Network',
    title: 'WLAN / Netzwerk',
    icon: Wifi,
    fields: [
      ['wifiEnabled', 'WLAN'],
      ['wifiSsid', 'SSID'],
      ['ntpServer', 'NTP'],
      ['ethernetEnabled', 'Ethernet'],
      ['rsyslogServer', 'Syslog'],
    ],
  },
  {
    name: 'Bluetooth',
    icon: Bluetooth,
    fields: [
      ['enabled', 'Aktiv'],
      ['mode', 'Modus'],
      ['fixedPin', 'PIN'],
    ],
  },
];

function formatValue(value) {
  if (value === true) return 'Ja';
  if (value === false) return 'Nein';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function ConfigCard({ section, config }) {
  const Icon = section.icon;
  const values = config?.payload?.values || {};
  const hasValues = Object.values(values).some(value => value !== null && value !== undefined && value !== '');

  return (
    <div className="rounded-lg bg-white/75 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900 p-3 min-w-[220px] flex-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-blue-950 dark:text-blue-50">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          {section.title || section.name}
        </div>
        {config && <Badge variant="outline" className="text-[10px] border-blue-200 dark:border-blue-800">empfangen</Badge>}
      </div>

      {hasValues ? (
        <div className="space-y-1">
          {section.fields.map(([key, label]) => (
            <div key={key} className="flex justify-between gap-3 text-xs">
              <span className="text-blue-700 dark:text-blue-300">{label}</span>
              <span className="font-medium text-blue-950 dark:text-blue-50 text-right break-all">{formatValue(values[key])}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-blue-700 dark:text-blue-300">Noch nicht ausgelesen.</div>
      )}
    </div>
  );
}

export default function DeviceSettingsPanel() {
  const { connected, deviceConfigs, configSaveStatus, requestDeviceConfig } = useMeshStore();

  const configBySection = useMemo(() => {
    return Object.fromEntries(deviceConfigs.map(config => [config.section, config]));
  }, [deviceConfigs]);

  if (!connected) return null;

  return (
    <div className="border-b bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 px-3 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-blue-900 dark:text-blue-100">Geräte-Config auslesen</div>
            <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
              Liest per want_config_id gezielt MQTT, WLAN/Netzwerk und Bluetooth vom verbundenen Gerät.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {configSaveStatus === 'saved' && <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> gelesen</Badge>}
          {configSaveStatus === 'saving' && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100"><Database className="w-3 h-3 mr-1" /> speichert…</Badge>}
          {configSaveStatus === 'requesting' && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Anfrage läuft…</Badge>}
          <Button size="sm" variant="outline" onClick={requestDeviceConfig} className="bg-white/80 dark:bg-slate-900/60 gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Config lesen
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        {SECTIONS.map(section => (
          <ConfigCard key={section.name} section={section} config={configBySection[section.name]} />
        ))}
      </div>
    </div>
  );
}