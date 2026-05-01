import { useMemo } from 'react';
import { Settings, Wifi, Bluetooth, Cloud, RefreshCw, CheckCircle2, Database, ChevronDown, Cpu, MapPin, Battery, Monitor, Radio, Shield, Cable, Boxes, Activity, Users, Hash, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
import { useMeshStore } from '@/hooks/useMeshStore.js';

const SECTION_META = {
  User: { title: 'User / Node-Name', icon: User },
  LoRa: { title: 'LoRa Einstellungen', icon: Radio },
  Channel: { title: 'Kanal', icon: Hash },
  Device: { title: 'Gerät', icon: Cpu },
  Position: { title: 'Position / GPS', icon: MapPin },
  Power: { title: 'Stromsparmodus', icon: Battery },
  Network: { title: 'WLAN / Netzwerk', icon: Wifi },
  Display: { title: 'Display', icon: Monitor },
  Bluetooth: { title: 'Bluetooth', icon: Bluetooth },
  Security: { title: 'Sicherheit', icon: Shield },
  MQTT: { title: 'MQTT', icon: Cloud },
  Serial: { title: 'Seriell', icon: Cable },
  StoreForward: { title: 'Store & Forward', icon: Boxes },
  RangeTest: { title: 'Range Test', icon: Activity },
  Telemetry: { title: 'Telemetrie', icon: Activity },
  NeighborInfo: { title: 'Nachbar-Info', icon: Users },
  Paxcounter: { title: 'Paxcounter', icon: Users },
};

const FIELD_LABELS = {
  longName: 'Langname', shortName: 'Kurzname', nodeId: 'Node-ID', hardware: 'Hardware', licensed: 'Lizenziert', channelName: 'Name', channelRole: 'Rolle', channelIndex: 'Index', psk: 'PSK', uplinkEnabled: 'Uplink', downlinkEnabled: 'Downlink',
  enabled: 'Aktiv', wifiEnabled: 'WLAN', wifiSsid: 'SSID', wifiPsk: 'WLAN Passwort', ntpServer: 'NTP', ethernetEnabled: 'Ethernet', rsyslogServer: 'Syslog',
  address: 'Server', username: 'Benutzer', password: 'Passwort', rootTopic: 'Root Topic', encryptionEnabled: 'Verschlüsselung', jsonEnabled: 'JSON', tlsEnabled: 'TLS', proxyToClientEnabled: 'Proxy zum Client',
  mode: 'Modus', fixedPin: 'PIN', role: 'Rolle', serialEnabled: 'Seriell aktiv', buttonGpio: 'Button GPIO', buzzerGpio: 'Buzzer GPIO', rebroadcastMode: 'Rebroadcast', nodeInfoBroadcastSecs: 'NodeInfo Intervall',
  positionBroadcastSecs: 'Positionsintervall', smartPositionEnabled: 'Smart Position', fixedPosition: 'Feste Position', gpsEnabled: 'GPS', gpsUpdateInterval: 'GPS Update', gpsAttemptTime: 'GPS Versuchsdauer', broadcastSmartMinimumDistance: 'Smart Distanz', broadcastSmartMinimumIntervalSecs: 'Smart Intervall',
  waitBluetoothSecs: 'Bluetooth Wartezeit', sdsSecs: 'Shutdown Sleep', lsSecs: 'Light Sleep', minWakeSecs: 'Min. Wachzeit', deviceBatteryInaAddress: 'INA Adresse', powermonEnabled: 'Power Monitor',
  screenOnSecs: 'Display an', gpsFormat: 'GPS Format', autoScreenCarouselSecs: 'Karussell', compassNorthTop: 'Kompass Nord oben', flipScreen: 'Display drehen', units: 'Einheiten',
  usePreset: 'Preset verwenden', region: 'Region', modemPreset: 'Modem Preset', bandwidth: 'Bandbreite', spreadFactor: 'Spread Factor', codingRate: 'Coding Rate', frequencyOffset: 'Frequenz-Offset', hopLimit: 'Hop Limit', txEnabled: 'TX aktiv', txPower: 'TX Leistung', channelNum: 'Kanalnummer', overrideDutyCycle: 'Duty Cycle Override', sx126xRxBoostedGain: 'RX Boost',
  publicKey: 'Public Key', privateKey: 'Private Key', adminKey: 'Admin Key', debugLogApiEnabled: 'Debug API', echo: 'Echo', rxd: 'RXD', txd: 'TXD', baud: 'Baud', timeout: 'Timeout',
  heartbeat: 'Heartbeat', records: 'Records', historyReturnMax: 'History Max', historyReturnWindow: 'History Fenster', sender: 'Sender', save: 'Speichern', deviceUpdateInterval: 'Geräteintervall', environmentUpdateInterval: 'Umgebungsintervall', environmentMeasurementEnabled: 'Umgebung messen', environmentScreenEnabled: 'Umgebung anzeigen', powerMeasurementEnabled: 'Power messen', powerUpdateInterval: 'Power Intervall', updateInterval: 'Update Intervall', transmitOverLora: 'Über LoRa senden', paxcounterUpdateInterval: 'Paxcounter Intervall',
};

function formatValue(value) {
  if (value === true) return 'Ja';
  if (value === false) return 'Nein';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function getDisplayValues(config) {
  if (config.section?.startsWith('Channel')) {
    const roleNames = ['Deaktiviert', 'Primär', 'Sekundär'];
    return {
      channelIndex: config.payload?.index,
      channelName: config.payload?.settings?.name || `Kanal ${config.payload?.index ?? '?'}`,
      channelRole: roleNames[config.payload?.role] || config.payload?.role,
      psk: config.payload?.settings?.psk ? 'vorhanden' : '',
      channelNum: config.payload?.settings?.channelNum,
      uplinkEnabled: config.payload?.settings?.uplinkEnabled,
      downlinkEnabled: config.payload?.settings?.downlinkEnabled,
    };
  }

  return {};
}

function hasUsefulValues(config) {
  const values = config.payload?.values || getDisplayValues(config);
  const keys = Object.keys(values);
  if (keys.length === 0) return false;
  if (keys.every(key => /^Feld \d+$/.test(key))) return false;
  return Object.values(values).some(value => value !== null && value !== undefined && value !== '');
}

function ConfigCard({ config }) {
  const sectionKey = config.section?.startsWith('Channel') ? 'Channel' : config.section;
  const meta = SECTION_META[sectionKey] || { title: config.section, icon: Settings };
  const Icon = meta.icon;
  const values = config.payload?.values || getDisplayValues(config);
  const entries = Object.entries(values).filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <div className="rounded-lg bg-white/75 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900 p-3 min-w-[220px] flex-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-blue-950 dark:text-blue-50">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          {meta.title}
        </div>
        <Badge variant="outline" className="text-[10px] border-blue-200 dark:border-blue-800">empfangen</Badge>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3 text-xs">
              <span className="text-blue-700 dark:text-blue-300">{FIELD_LABELS[key] || key}</span>
              <span className="font-medium text-blue-950 dark:text-blue-50 text-right break-all">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-blue-700 dark:text-blue-300">Keine auswertbaren Felder.</div>
      )}
    </div>
  );
}

export default function DeviceSettingsPanel() {
  const { connected, deviceConfigs, configSaveStatus, requestDeviceConfig, myNode, myNodeNum, metadata } = useMeshStore();
  const [isOpen, setIsOpen] = useLocalStorage('deviceSettingsPanel.open', true);

  const sortedConfigs = useMemo(() => {
    const userConfig = myNodeNum ? [{
      category: 'local',
      section: 'User',
      payload: {
        values: {
          longName: myNode?.user?.longName,
          shortName: myNode?.user?.shortName,
          nodeId: myNode?.user?.id || `!${myNodeNum.toString(16).padStart(8, '0')}`,
          hardware: myNode?.user?.hwModel ?? metadata?.hwModel,
          licensed: myNode?.user?.isLicensed,
        },
      },
    }] : [];
    const order = Object.keys(SECTION_META);
    // Auslesbare, aktuell bewusst ausgeblendete Bereiche ohne sichere Feldzuordnung:
    // SessionKey, ExternalNotification, CannedMessage, Audio, RemoteHardware,
    // AmbientLighting, DetectionSensor und unbekannte reine Rohfelder wie "Feld 1/2/3".
    return [...userConfig, ...deviceConfigs]
      .filter(hasUsefulValues)
      .sort((a, b) => {
        const aKey = a.section?.startsWith('Channel') ? 'Channel' : a.section;
        const bKey = b.section?.startsWith('Channel') ? 'Channel' : b.section;
        return order.indexOf(aKey) - order.indexOf(bKey);
      });
  }, [deviceConfigs, myNode, myNodeNum, metadata]);

  if (!connected) return null;

  return (
    <div className="border-b bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 px-3 py-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-blue-900 dark:text-blue-100">Geräte-Einstellungen</div>
            <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
              Wichtige Einstellungen: User/Node-Name, Kanaldefinitionen und LoRa zuerst · leere Rohfelder werden ausgeblendet.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {configSaveStatus === 'saved' && <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> gelesen</Badge>}
          {configSaveStatus === 'saving' && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100"><Database className="w-3 h-3 mr-1" /> speichert…</Badge>}
          {configSaveStatus === 'requesting' && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Anfrage läuft…</Badge>}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={requestDeviceConfig} className="bg-white/80 dark:bg-slate-900/60 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Config lesen
            </Button>
          </div>

          {sortedConfigs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {sortedConfigs.map(config => <ConfigCard key={`${config.category}-${config.section}`} config={config} />)}
            </div>
          ) : (
            <div className="rounded-lg bg-white/75 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900 p-3 text-xs text-blue-700 dark:text-blue-300">
              Noch keine Einstellungen empfangen. Klicke auf „Config lesen“.
            </div>
          )}
        </div>
      )}
    </div>
  );
}