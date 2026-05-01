import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Usb, List, Map, Wifi, Activity, Cpu, Filter, AlertTriangle, Moon, Database } from 'lucide-react';

function Section({ icon: Icon, color, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 border-b dark:border-slate-700 ${color}`}>
        <Icon className="w-5 h-5" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">Hilfe & Anleitung</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-5">

        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Erste Schritte & Hilfe</h1>

        <Section icon={Usb} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" title="1. Gerät verbinden">
          <p>Diese App nutzt die <strong>Web Serial API</strong> – sie funktioniert nur in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> oder einem anderen Chromium-basierten Browser auf Desktop.</p>
          <p>Schritte:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Meshtastic-Gerät per USB-Kabel mit dem Computer verbinden.</li>
            <li>Auf <strong>"Mit Gerät verbinden"</strong> klicken.</li>
            <li>Im Browser-Dialog den richtigen seriellen Port auswählen (meist CP210x, CH340 oder direktes USB-Serial).</li>
            <li>Das Dashboard lädt automatisch alle bekannten Nodes und Telemetriedaten.</li>
          </ol>
          <p className="text-xs text-slate-400">Falls kein Port erscheint: USB-Kabel prüfen (Datenkabel, kein reines Ladekabel) oder den passenden Treiber installieren (CP210x, CH340).</p>
        </Section>

        <Section icon={Activity} color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" title="2. Statusleiste & Kacheln">
          <p>Direkt unter dem Header zeigen vier Kacheln den aktuellen Mesh-Status:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>Nodes gesamt</strong> – alle bekannten Nodes (Klick: alle Filter zurücksetzen).</li>
            <li><strong>Aktiv (15min)</strong> – Nodes mit Aktivität in den letzten 15 Minuten.</li>
            <li><strong>Mit GPS</strong> – Nodes, die Positionsdaten gesendet haben.</li>
            <li><strong>Nachrichten</strong> – Anzahl empfangener Text-Nachrichten in der aktuellen Session.</li>
          </ul>
          <p>Aktivitäts- und GPS-Kacheln sind klickbar und filtern die Node-Liste entsprechend.</p>
        </Section>

        <Section icon={List} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" title="3. Node-Liste, Suche & Filter">
          <p>Die linke Spalte zeigt alle bekannten Nodes im Mesh. Du kannst:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Nach <strong>Name, Kurzname oder Node-ID</strong> suchen.</li>
            <li>Sortieren nach: Mein Gerät zuerst, zuletzt gehört, Name (A–Z), SNR, Akku oder Entfernung.</li>
            <li>Mehrere <strong>Filter kombinieren</strong>: aktiv, direkt verbunden, mit GPS/Telemetrie/Umweltsensoren, Akku kritisch/gut, Entfernung (1/5/25 km).</li>
            <li>Einen Node anklicken, um ihn auf der Karte zu markieren und Details rechts zu sehen.</li>
          </ul>
          <p>Dein eigenes Gerät ist mit einem <strong>⭐ Stern</strong> und grünem Rahmen markiert.</p>
        </Section>

        <Section icon={Map} color="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" title="4. Karte & Positionen">
          <p>Alle Nodes mit GPS-Koordinaten erscheinen auf der OpenStreetMap-Karte.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Klick auf einen Marker zeigt Details und wählt den Node aus.</li>
            <li>Die Karte zoomt automatisch auf alle sichtbaren Nodes.</li>
            <li>In der Node-Detailansicht (Tab "Position") gibt es eine Mini-Karte und die berechnete Entfernung zu deinem eigenen Gerät.</li>
          </ul>
        </Section>

        <Section icon={Wifi} color="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300" title="5. Signal, Telemetrie & Umgebung">
          <p>Im Detailbereich (Node auswählen) findest du Tabs für:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>Info</strong> – Hardware, Node-ID, Hops, MQTT-Status, zuletzt gehört.</li>
            <li><strong>Signal</strong> – aktuelle SNR/RSSI, Verlauf der letzten 15 Minuten und Diagramm der letzten 2 Stunden.</li>
            <li><strong>Position</strong> – GPS-Koordinaten, Höhe, Satelliten, DOP-Werte und Mini-Karte.</li>
            <li><strong>Telemetrie</strong> – Gerätemetriken (Akku, Spannung, Uptime, TX/RX, Auslastung) und Verlaufs-Charts.</li>
            <li><strong>Umgebung</strong> – Temperatur, Luftfeuchtigkeit, Luftdruck, Lux, Wind, Gewicht usw., sofern Sensoren vorhanden.</li>
          </ul>
          <p className="text-xs text-slate-400">SNR &gt; 0 dB ist gut, RSSI näher an 0 ist besser (z. B. –80 dBm &gt; –120 dBm). Akku &gt; 100 % bedeutet Netzbetrieb (⚡).</p>
        </Section>

        <Section icon={Cpu} color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" title="6. Empfangene Pakete">
          <p>Im unteren Bereich der Mitte werden alle empfangenen Pakete in Echtzeit aufgelistet:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Spalten: <strong>Von, Typ, Details, Zeit</strong> – Klick auf den Sender wählt den Node aus.</li>
            <li>Klick auf eine Zeile öffnet die <strong>Hex- und JSON-Ansicht</strong> des Roh-Pakets – ideal zur Analyse.</li>
            <li>Es werden die letzten 50 Pakete angezeigt, ältere werden automatisch verworfen.</li>
          </ul>
        </Section>

        <Section icon={Database} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" title="7. Anmeldung & historischer Verlauf">
          <p>Optional kannst du dich anmelden (Button oben rechts oder auf der Startseite). Vorteile:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Empfangene <strong>Pakete und Node-Zustände werden gespeichert</strong>, solange ein Gerät verbunden ist.</li>
            <li>Auch <strong>ohne USB-Verbindung</strong> siehst du dein Dashboard – mit den letzten gespeicherten Daten.</li>
            <li>Über die <strong>Geräteauswahl</strong> oben kannst du zwischen mehreren eigenen Meshtastic-Geräten umschalten.</li>
            <li>Daten werden <strong>pro Benutzer privat</strong> gespeichert – andere sehen sie nicht.</li>
          </ul>
          <p className="text-xs text-slate-400">Ohne Anmeldung bleibt alles wie gewohnt rein lokal im Browser, es wird nichts gespeichert.</p>
        </Section>

        <Section icon={Moon} color="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200" title="8. Dark Mode & Layout">
          <p>Über das Mond-/Sonnen-Symbol im Header wechselst du zwischen hellem und dunklem Design.</p>
          <p>Die Spalten und Bereiche im Desktop-Layout sind frei <strong>verschiebbar</strong> – einfach die grauen Trennleisten ziehen, um die Größen anzupassen.</p>
          <p>Auf mobilen Geräten erscheinen Karte, Nodes und Details als Tabs.</p>
        </Section>

        <Section icon={AlertTriangle} color="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" title="Wichtige Hinweise zur Funkdisziplin">
          <p>Beim Einsatz von Meshtastic-Geräten gelten die nationalen Funkvorschriften. In Deutschland gelten die Bestimmungen der <strong>Bundesnetzagentur (BNetzA)</strong>.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Einhaltung der zulässigen Sendeleistung (max. 25 mW ERP im 868-MHz-Band).</li>
            <li>Duty-Cycle-Begrenzung: max. <strong>1 % Sendedauer</strong> pro Stunde im 868-MHz-Band.</li>
            <li>Keine missbräuchliche oder störende Nutzung des Frequenzbands.</li>
            <li>Für Amateurfunk-Frequenzen gelten abweichende Regeln (Lizenzpflicht).</li>
          </ul>
          <p className="text-xs text-slate-400 mt-1">Diese App und ihr Betreiber übernehmen keine Haftung für Verstöße gegen Funkvorschriften durch den Nutzer.</p>
        </Section>

        <div className="flex gap-3 text-sm text-center pb-6">
          <Link to="/about" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">Über diese App</Link>
          <Link to="/impressum" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">Impressum</Link>
          <a href="https://meshtastic.org/docs" target="_blank" rel="noopener noreferrer" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">Meshtastic Docs ↗</a>
        </div>
      </div>
    </div>
  );
}