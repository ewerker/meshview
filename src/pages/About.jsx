import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Map, Activity, Wifi, Thermometer, Shield, Cpu, Filter, Moon, Database } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

const APP_VERSION = 'v1.1.0';

const pageCopy = {
  de: {
    title: 'Über diese App',
    intro: 'Ein browserbasiertes Monitoring-Interface für Meshtastic-Mesh-Funknetze. Schließe dein Gerät per USB an und erhalte einen Echtzeit-Überblick über alle Nodes im Mesh – inklusive GPS-Positionen, Signal-Metriken, Akku-Werten, Umgebungssensorik und detaillierter Paket-Inspektion.',
    features: 'Funktionen',
    tech: 'Technologie',
    browser: 'Die App benötigt einen Chromium-basierten Browser (Chrome, Edge, Opera) auf Desktop. Firefox und Safari unterstützen die Web Serial API nicht.',
    links: 'Links',
    project: 'Offizielles Meshtastic-Projekt',
    operator: 'Webseite des Betreibers',
    legal: 'Impressum & Haftungsausschluss',
    help: 'Hilfe & Anleitung',
    techItems: [
      'Web Serial API – direkte USB-Verbindung ohne Zusatzsoftware (Chrome/Edge)',
      'Protobuf-Parser – natives Meshtastic-Protokoll, kein zusätzlicher Server nötig',
      'React + Tailwind CSS – modernes, responsives UI mit Dark Mode',
      'OpenStreetMap / Leaflet – Karten-Visualisierung',
      'Recharts – Telemetrie- und Signal-Diagramme',
      'Lokal & datensparsam – ohne Anmeldung und Backup keine Speicherung außerhalb des Browsers',
    ],
  },
  en: {
    title: 'About this app',
    intro: 'A browser-based monitoring interface for Meshtastic mesh radio networks. Connect your device via USB and get a real-time overview of all nodes in the mesh – including GPS positions, signal metrics, battery values, environmental sensors and detailed packet inspection.',
    features: 'Features',
    tech: 'Technology',
    browser: 'This app requires a Chromium-based desktop browser such as Chrome, Edge or Opera. Firefox and Safari do not support the Web Serial API.',
    links: 'Links',
    project: 'Official Meshtastic project',
    operator: 'Operator website',
    legal: 'Legal notice & disclaimer',
    help: 'Help & guide',
    techItems: [
      'Web Serial API – direct USB connection without additional software (Chrome/Edge)',
      'Protobuf parser – native Meshtastic protocol, no extra server required',
      'React + Tailwind CSS – modern, responsive UI with dark mode',
      'OpenStreetMap / Leaflet – map visualization',
      'Recharts – telemetry and signal charts',
      'Local & privacy-conscious – without sign-in and backup, nothing is stored outside the browser',
    ],
  },
};

const features = [
  { icon: Radio, color: 'text-blue-600 bg-blue-50', titleKey: 'featureNodeTitle', descKey: 'featureNodeDesc' },
  { icon: Map, color: 'text-red-600 bg-red-50', titleKey: 'featureMapTitle', descKey: 'featureMapDesc' },
  { icon: Activity, color: 'text-green-600 bg-green-50', titleKey: 'featureTelemetryTitle', descKey: 'featureTelemetryDesc' },
  { icon: Thermometer, color: 'text-orange-600 bg-orange-50', titleKey: 'featureEnvTitle', descKey: 'featureEnvDesc' },
  { icon: Wifi, color: 'text-cyan-600 bg-cyan-50', titleKey: 'featureSignalTitle', descKey: 'featureSignalDesc' },
  { icon: Cpu, color: 'text-indigo-600 bg-indigo-50', titleKey: 'featurePacketTitle', descKey: 'featurePacketDesc' },
  { icon: Filter, color: 'text-amber-600 bg-amber-50', titleKey: 'featureFilterTitle', descKey: 'featureFilterDesc' },
  { icon: Moon, color: 'text-slate-600 bg-slate-100', titleKey: 'featureLayoutTitle', descKey: 'featureLayoutDesc' },
  { icon: Database, color: 'text-purple-600 bg-purple-50', titleKey: 'aboutBackupTitle', descKey: 'aboutBackupDesc' },
  { icon: Shield, color: 'text-yellow-600 bg-yellow-50', titleKey: 'aboutPrivacyTitle', descKey: 'aboutPrivacyDesc' },
];

export default function About() {
  const { t, language } = useI18n();
  const copy = pageCopy[language] || pageCopy.de;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">{t('dashboard')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">{copy.title}</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Meshtastic Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{APP_VERSION} · Frank Richter / DoubleU2</p>
          <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">{copy.intro}</p>
        </div>

        <section>
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">{copy.features}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.titleKey} className="bg-white dark:bg-slate-800 rounded-lg p-4 border dark:border-slate-700 flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t(f.titleKey)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t(f.descKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{copy.tech}</h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            {copy.techItems.map(item => <p key={item}>• {item}</p>)}
          </div>
        </section>

        <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ {copy.browser}
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 space-y-2">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{copy.links}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300"><a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">meshtastic.org</a> – {copy.project}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300"><a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">w-2.de</a> – {copy.operator}</p>
          <p className="text-sm"><Link to="/impressum" className="text-blue-600 dark:text-blue-400 hover:underline">{copy.legal}</Link></p>
          <p className="text-sm"><Link to="/help" className="text-blue-600 dark:text-blue-400 hover:underline">{copy.help}</Link></p>
        </section>

        <p className="text-xs text-slate-400 pb-6 text-center">© 2026 Frank Richter / DoubleU2 · Meshtastic Dashboard {APP_VERSION}</p>
      </div>
    </div>
  );
}