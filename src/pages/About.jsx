import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Map, MessageSquare, Activity, Wifi, Thermometer, Shield, Cpu, Filter, Moon, Database } from 'lucide-react';

const APP_VERSION = 'v1.1.0';

const features = [
  { icon: Radio, color: 'text-blue-600 bg-blue-50', title: 'Node-Übersicht', desc: 'Alle Nodes im Mesh mit Name, ID, Hardware-Modell, Hops und Verbindungsstatus auf einen Blick.' },
  { icon: Map, color: 'text-red-600 bg-red-50', title: 'GPS-Karte', desc: 'Interaktive OpenStreetMap-Karte mit allen Positionen sowie Mini-Karte und Distanz-Berechnung in der Detail-Ansicht.' },
  { icon: Activity, color: 'text-green-600 bg-green-50', title: 'Telemetrie & Charts', desc: 'Echtzeit-Charts für Akku, Spannung, Kanal-Auslastung und Uptime – inklusive Verlauf der letzten Telemetrie-Pakete.' },
  { icon: Thermometer, color: 'text-orange-600 bg-orange-50', title: 'Umgebungssensoren', desc: 'Temperatur, Luftfeuchtigkeit, Luftdruck, Lux, Wind und mehr – sofern der Node entsprechende Sensoren hat.' },
  { icon: Wifi, color: 'text-cyan-600 bg-cyan-50', title: 'Signalwerte', desc: 'SNR, RSSI und Hop-Count je Übertragung – mit Verlaufsdiagramm der letzten 2 Stunden.' },
  { icon: Cpu, color: 'text-indigo-600 bg-indigo-50', title: 'Paket-Inspektor', desc: 'Live-Tabelle aller empfangenen Pakete mit Typ, Sender, Details und ausklappbarer Hex-/JSON-Ansicht.' },
  { icon: Filter, color: 'text-amber-600 bg-amber-50', title: 'Filter & Sortierung', desc: 'Nodes filtern nach Aktivität, GPS, Akku, Telemetrie, Entfernung – und sortieren nach SNR, Distanz, Akku u. a.' },
  { icon: Moon, color: 'text-slate-600 bg-slate-100', title: 'Dark Mode & Layout', desc: 'Helles und dunkles Design, frei verschiebbare Panels für individuelle Arbeitsbereiche.' },
  { icon: Database, color: 'text-purple-600 bg-purple-50', title: 'Historischer Verlauf (optional)', desc: 'Mit Anmeldung werden empfangene Daten gespeichert und sind später pro Gerät auch ohne USB-Verbindung abrufbar.' },
  { icon: Shield, color: 'text-yellow-600 bg-yellow-50', title: 'Datenschutz', desc: 'Ohne Anmeldung bleiben alle Daten ausschließlich lokal im Browser. Gespeicherte Daten sind privat und nur für dich sichtbar.' },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">Über diese App</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">

        {/* Hero */}
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Meshtastic Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{APP_VERSION} · von Frank Richter / DoubleU2</p>
          <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
            Ein browserbasiertes Monitoring-Interface für Meshtastic-Mesh-Funknetze.
            Schließe dein Gerät per USB an und erhalte einen Echtzeit-Überblick über alle Nodes
            im Mesh – inklusive GPS-Positionen, Signal-Metriken, Akku-Werten, Umgebungssensorik
            und detaillierter Paket-Inspektion. Komplett lokal, ohne Cloud, ohne Server.
          </p>
        </div>

        {/* Features */}
        <section>
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Funktionen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="bg-white dark:bg-slate-800 rounded-lg p-4 border dark:border-slate-700 flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-700 dark:text-slate-200">{f.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Technologie</h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p>• <strong>Web Serial API</strong> – direkte USB-Verbindung ohne Zusatzsoftware (Chrome/Edge)</p>
            <p>• <strong>Protobuf-Parser</strong> – natives Meshtastic-Protokoll, kein zusätzlicher Server nötig</p>
            <p>• <strong>React + Tailwind CSS</strong> – modernes, responsives UI mit Dark Mode</p>
            <p>• <strong>OpenStreetMap / Leaflet</strong> – Karten-Visualisierung</p>
            <p>• <strong>Recharts</strong> – Telemetrie- und Signal-Diagramme</p>
            <p>• <strong>Lokal & datensparsam</strong> – keine Datenübertragung an Dritte</p>
          </div>
        </section>

        {/* Browser-Hinweis */}
        <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Die App benötigt einen Chromium-basierten Browser (Chrome, Edge, Opera) auf Desktop.
          Firefox und Safari unterstützen die Web Serial API nicht.
        </section>

        {/* Links */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 space-y-2">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Links</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300"><a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">meshtastic.org</a> – Offizielles Meshtastic-Projekt</p>
          <p className="text-sm text-slate-600 dark:text-slate-300"><a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">w-2.de</a> – Webseite des Betreibers</p>
          <p className="text-sm">
            <Link to="/impressum" className="text-blue-600 dark:text-blue-400 hover:underline">Impressum & Haftungsausschluss</Link>
          </p>
          <p className="text-sm">
            <Link to="/help" className="text-blue-600 dark:text-blue-400 hover:underline">Hilfe & Anleitung</Link>
          </p>
        </section>

        <p className="text-xs text-slate-400 pb-6 text-center">© 2026 Frank Richter / DoubleU2 · Meshtastic Dashboard {APP_VERSION}</p>
      </div>
    </div>
  );
}