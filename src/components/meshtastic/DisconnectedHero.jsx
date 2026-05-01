import { Radio, Map, Activity, Thermometer, Wifi, Cpu, Filter, Moon, MessageSquare, Battery, Usb, Shield, Zap, LogIn, LogOut, Database, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: Radio, color: 'from-blue-500 to-cyan-500', title: 'Node-Übersicht', desc: 'Alle Mesh-Teilnehmer mit Hardware, Hops & Status auf einen Blick' },
  { icon: Map, color: 'from-rose-500 to-pink-500', title: 'Live GPS-Karte', desc: 'Positionen aller Nodes inkl. Distanz-Berechnung zu deinem Gerät' },
  { icon: Activity, color: 'from-emerald-500 to-green-500', title: 'Telemetrie-Charts', desc: 'Akku, Spannung, Auslastung & Uptime im Zeitverlauf' },
  { icon: Thermometer, color: 'from-orange-500 to-amber-500', title: 'Umgebungssensoren', desc: 'Temperatur, Luftdruck, Feuchte, Lux, Wind & mehr' },
  { icon: Wifi, color: 'from-indigo-500 to-blue-500', title: 'Signalqualität', desc: 'SNR-, RSSI- & Hop-Verlauf der letzten Stunden' },
  { icon: Cpu, color: 'from-violet-500 to-purple-500', title: 'Paket-Inspektor', desc: 'Roh-Pakete live mit Hex- und JSON-Ansicht analysieren' },
  { icon: Filter, color: 'from-yellow-500 to-orange-500', title: 'Filter & Sortierung', desc: 'Nach Aktivität, GPS, Akku, Distanz & mehr filtern' },
  { icon: Moon, color: 'from-slate-500 to-slate-700', title: 'Dark Mode & Layout', desc: 'Helles/dunkles Design – Panels frei verschiebbar' },
];

const HIGHLIGHTS = [
  { icon: Shield, text: '100 % lokal – keine Cloud, kein Server' },
  { icon: Zap, text: 'Echtzeit-Daten direkt vom Gerät' },
  { icon: Usb, text: 'Web Serial – ohne Installation' },
];

export default function DisconnectedHero() {
  const { isSupported } = useMeshStore();
  const { isAuthenticated, user, navigateToLogin, logout } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Bereit für Verbindung
          </div>
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 blur-2xl opacity-30 dark:opacity-40"></div>
            <div className="relative w-20 h-20 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl">
              <Radio className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
            Meshtastic Dashboard
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dein browserbasiertes Mission-Control für Meshtastic-Funknetze.
            Echtzeit-Monitoring von Nodes, Telemetrie, GPS-Positionen und Funk-Paketen –
            direkt aus dem Browser, ohne Server, ohne Cloud.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-slate-500 dark:text-slate-400">
            {HIGHLIGHTS.map(h => (
              <div key={h.text} className="flex items-center gap-1.5">
                <h.icon className="w-4 h-4 text-slate-400" />
                <span>{h.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 inline-flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Usb className="w-4 h-4" />
              <span>Gerät per USB anschließen und oben rechts auf <strong className="text-slate-700 dark:text-slate-200">„Mit Gerät verbinden"</strong> klicken</span>
            </div>

            {/* Auth section */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <Database className="w-5 h-5 text-blue-500" />
              {isAuthenticated ? (
                <>
                  <div className="text-sm text-left">
                    <div className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />{user?.full_name || user?.email}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Empfangene Daten werden gespeichert</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => logout()} className="gap-2">
                    <LogOut className="w-4 h-4" /> Abmelden
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-left">
                    <div className="font-medium text-slate-700 dark:text-slate-200">Nicht angemeldet</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Anmelden, um Daten zu speichern und Verlauf zu sehen</div>
                  </div>
                  <Button size="sm" onClick={navigateToLogin} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <LogIn className="w-4 h-4" /> Anmelden
                  </Button>
                </>
              )}
            </div>

            {!isSupported && (
              <div className="mt-5 max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm text-left">
                ⚠️ Dein Browser unterstützt die <strong>Web Serial API</strong> nicht.<br />
                Bitte <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> oder einen anderen Chromium-Browser auf dem Desktop verwenden.
              </div>
            )}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mb-10">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-5">
            Was diese App alles kann
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{f.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 mb-8">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            So funktioniert's
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { n: '1', t: 'Anschließen', d: 'Meshtastic-Gerät per USB-Kabel mit dem Computer verbinden.' },
              { n: '2', t: 'Verbinden', d: 'Auf „Mit Gerät verbinden" klicken und im Browser-Dialog den Port wählen.' },
              { n: '3', t: 'Loslegen', d: 'Nodes, Karte, Telemetrie & Pakete erscheinen automatisch in Echtzeit.' },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold">
                  {s.n}
                </div>
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200">{s.t}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 pb-4">
          <Link to="/help" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">Hilfe & Anleitung</Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">Über diese App</Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/impressum" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">Impressum</Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">meshtastic.org ↗</a>
        </div>
      </div>
    </div>
  );
}