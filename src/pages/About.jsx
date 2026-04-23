import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Map, MessageSquare, Activity, Bot, Wifi, Thermometer, Shield } from 'lucide-react';

const APP_VERSION = 'v1.0.0';

const features = [
  { icon: Radio, color: 'text-blue-600 bg-blue-50', title: 'Node-Übersicht', desc: 'Alle Nodes im Mesh mit Name, ID, Hardware-Modell und Verbindungsstatus auf einen Blick.' },
  { icon: Map, color: 'text-red-600 bg-red-50', title: 'GPS-Karte', desc: 'Interaktive OpenStreetMap-Karte mit allen Positionen der Mesh-Nodes.' },
  { icon: Activity, color: 'text-green-600 bg-green-50', title: 'Telemetrie', desc: 'Echtzeit-Anzeige von Akkustand, Spannung, Kanal-Auslastung und Uptime.' },
  { icon: Thermometer, color: 'text-orange-600 bg-orange-50', title: 'Umgebungssensoren', desc: 'Temperatur, Luftfeuchtigkeit, Luftdruck und weitere Umgebungsdaten.' },
  { icon: MessageSquare, color: 'text-purple-600 bg-purple-50', title: 'Nachrichten', desc: 'Empfangen und Senden von Text-Messages über das Mesh-Netzwerk.' },
  { icon: Wifi, color: 'text-cyan-600 bg-cyan-50', title: 'Signalwerte', desc: 'SNR, RSSI und Hop-Count für jede empfangene Übertragung.' },
  { icon: Bot, color: 'text-slate-600 bg-slate-100', title: 'Autoresponder', desc: 'Regelbasiertes automatisches Antworten auf eingehende Nachrichten mit Templates und Variablen.' },
  { icon: Shield, color: 'text-yellow-600 bg-yellow-50', title: 'Datenschutz', desc: 'Alle Daten bleiben lokal. Kein Server, keine Cloud – nur dein Browser und dein Gerät.' },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
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
          <h1 className="text-2xl font-bold text-slate-800">Meshtastic Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{APP_VERSION} · von Frank Richter / DoubleU2</p>
          <p className="text-slate-600 mt-4 leading-relaxed">
            A browser-based monitoring and control interface for Meshtastic mesh radio networks.
            Connect your device via USB and get a real-time overview of all nodes in your mesh —
            including GPS positions, signal metrics, battery levels, environmental sensor data,
            text messages, and an integrated autoresponder.
          </p>
        </div>

        {/* Features */}
        <section>
          <h2 className="font-semibold text-slate-700 mb-4">Funktionen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-lg p-4 border flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-700">{f.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech */}
        <section className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-slate-700 mb-3">Technologie</h2>
          <div className="text-sm text-slate-600 space-y-1">
            <p>• <strong>Web Serial API</strong> – direkte USB-Verbindung ohne Treiber (Chrome/Edge)</p>
            <p>• <strong>Protobuf</strong> – natives Meshtastic-Protokoll, kein zusätzlicher Server nötig</p>
            <p>• <strong>React + Tailwind CSS</strong> – modernes, responsives UI</p>
            <p>• <strong>OpenStreetMap / Leaflet</strong> – Kartenansicht</p>
            <p>• <strong>localStorage</strong> – Autoresponder-Regeln werden lokal gespeichert</p>
          </div>
        </section>

        {/* Links */}
        <section className="bg-white rounded-lg border p-4 space-y-2">
          <h2 className="font-semibold text-slate-700 mb-1">Links</h2>
          <p className="text-sm"><a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">meshtastic.org</a> – Offizielles Meshtastic-Projekt</p>
          <p className="text-sm"><a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">w-2.de</a> – Webseite des Betreibers</p>
          <p className="text-sm">
            <Link to="/impressum" className="text-blue-600 hover:underline">Impressum & Haftungsausschluss</Link>
          </p>
          <p className="text-sm">
            <Link to="/help" className="text-blue-600 hover:underline">Hilfe & Anleitung</Link>
          </p>
        </section>

        <p className="text-xs text-slate-400 pb-6 text-center">© 2026 Frank Richter / DoubleU2 · Meshtastic Dashboard {APP_VERSION}</p>
      </div>
    </div>
  );
}