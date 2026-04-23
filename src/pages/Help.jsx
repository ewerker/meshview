import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Usb, List, Map, MessageSquare, Bot, AlertTriangle, Wifi } from 'lucide-react';

function Section({ icon: Icon, color, title, children }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${color}`}>
        <Icon className="w-5 h-5" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4 text-sm text-slate-600 space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
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

        <h1 className="text-xl font-bold text-slate-800">Erste Schritte & Hilfe</h1>

        <Section icon={Usb} color="bg-green-50 text-green-700" title="1. Gerät verbinden">
          <p>Diese App nutzt die <strong>Web Serial API</strong> – sie funktioniert nur in <strong>Google Chrome</strong> oder <strong>Microsoft Edge</strong> (Desktop).</p>
          <p>Schritte:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Meshtastic-Gerät per USB-Kabel mit dem Computer verbinden.</li>
            <li>Auf <strong>"Mit Gerät verbinden"</strong> klicken.</li>
            <li>Im Browser-Dialog den richtigen seriellen Port auswählen (meist CP210x oder CH340).</li>
            <li>Das Dashboard lädt automatisch alle Nodes und Daten.</li>
          </ol>
          <p className="text-xs text-slate-400">Falls kein Port erscheint: Treiber für CP210x (Silicon Labs) oder CH340 installieren.</p>
        </Section>

        <Section icon={List} color="bg-blue-50 text-blue-700" title="2. Node-Liste & Suche">
          <p>Die linke Spalte zeigt alle bekannten Nodes im Mesh. Du kannst:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Nach <strong>Name, Kurzname oder Node-ID</strong> suchen.</li>
            <li>Sortieren nach: Mein Gerät zuerst, zuletzt gehört, Name (A–Z), SNR, Akku oder Hops.</li>
            <li>Einen Node anklicken, um ihn auf der Karte zu markieren und Details zu sehen.</li>
          </ul>
          <p>Dein eigenes Gerät ist mit einem <strong>⭐ Stern</strong> und grünem Rahmen markiert.</p>
        </Section>

        <Section icon={Map} color="bg-red-50 text-red-700" title="3. Karte">
          <p>Alle Nodes mit GPS-Koordinaten werden auf der OpenStreetMap-Karte angezeigt.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Klicke auf einen Marker um Details zu sehen.</li>
            <li>Die Karte zoomt automatisch auf alle Nodes mit Position.</li>
            <li>Grüner Kreis = dein Gerät, Blau = ausgewählter Node, Grau = andere.</li>
          </ul>
        </Section>

        <Section icon={Wifi} color="bg-cyan-50 text-cyan-700" title="4. Telemetrie & Signalwerte">
          <p>Im rechten Detailbereich (Node auswählen) findest du:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>SNR</strong> (Signal-Rausch-Verhältnis in dB) – je höher, desto besser. Über 0 dB ist gut.</li>
            <li><strong>RSSI</strong> (Empfangsstärke in dBm) – näher an 0 ist besser (z. B. –80 dBm &gt; –120 dBm).</li>
            <li><strong>Hops</strong> – Anzahl der Zwischenstationen. 0 = Direktverbindung.</li>
            <li><strong>Akku, Spannung, Uptime, Kanal-Auslastung</strong> aus der Geräte-Telemetrie.</li>
            <li><strong>Temperatur, Luftfeuchtigkeit, Luftdruck</strong> wenn ein Umgebungssensor vorhanden ist.</li>
          </ul>
        </Section>

        <Section icon={MessageSquare} color="bg-purple-50 text-purple-700" title="5. Nachrichten senden & empfangen">
          <p>Im unteren Bereich der Mitte werden alle Text-Messages angezeigt.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Ziel wählen: <strong>Broadcast</strong> (an alle) oder einen einzelnen Node.</li>
            <li>Text eingeben und mit <strong>Enter</strong> oder dem Senden-Button abschicken.</li>
            <li>Empfangene Nachrichten zeigen SNR und RSSI des Empfangs.</li>
          </ul>
        </Section>

        <Section icon={Bot} color="bg-slate-100 text-slate-700" title="6. Autoresponder">
          <p>Der Autoresponder antwortet automatisch auf eingehende Nachrichten basierend auf konfigurierbaren Regeln.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Über den Button <strong>"Autoresponder"</strong> im Header erreichbar.</li>
            <li><strong>Vorlagen</strong> können Variablen enthalten: <code className="bg-slate-100 px-1 rounded">{'{{sender.longName}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{msg.snr}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{my.battery}}'}</code>, u. v. m.</li>
            <li><strong>Filter</strong> begrenzen die Auslösung auf bestimmte Texte, Sender, SNR-Werte oder Entfernungen.</li>
            <li><strong>Cooldown</strong> verhindert Antwort-Schleifen – pro Sender separat.</li>
            <li>Regeln werden im Browser gespeichert (localStorage) und bleiben nach Neustart erhalten.</li>
          </ul>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800 text-xs mt-2">
            ⚠️ Der Autoresponder sendet nur, solange diese Seite im Browser geöffnet ist.
          </div>
        </Section>

        <Section icon={AlertTriangle} color="bg-yellow-50 text-yellow-700" title="Wichtige Hinweise zur Funkdisziplin">
          <p>Beim Einsatz von Meshtastic-Geräten gelten die nationalen Funkvorschriften. In Deutschland gelten die Bestimmungen der <strong>Bundesnetzagentur (BNetzA)</strong>.</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Einhaltung der zulässigen Sendeleistung (max. 25 mW ERP im 868-MHz-Band).</li>
            <li>Duty-Cycle-Begrenzung: max. <strong>1 % Sendedauer</strong> pro Stunde im 868-MHz-Band beachten.</li>
            <li>Keine missbräuchliche oder störende Nutzung des Frequenzbands.</li>
            <li>Autoresponder so konfigurieren, dass keine Sendestürme entstehen (Cooldown nutzen!).</li>
            <li>Für Amateurfunk-Frequenzen gelten abweichende Regeln (Lizenzpflicht).</li>
          </ul>
          <p className="text-xs text-slate-400 mt-1">Diese App und ihr Betreiber übernehmen keine Haftung für Verstöße gegen Funkvorschriften durch den Nutzer.</p>
        </Section>

        <div className="flex gap-3 text-sm text-center pb-6">
          <Link to="/about" className="flex-1 bg-white border rounded-lg py-3 text-blue-600 hover:bg-blue-50 transition-colors">Über diese App</Link>
          <Link to="/impressum" className="flex-1 bg-white border rounded-lg py-3 text-blue-600 hover:bg-blue-50 transition-colors">Impressum</Link>
          <a href="https://meshtastic.org/docs" target="_blank" rel="noopener noreferrer" className="flex-1 bg-white border rounded-lg py-3 text-blue-600 hover:bg-blue-50 transition-colors">Meshtastic Docs ↗</a>
        </div>
      </div>
    </div>
  );
}