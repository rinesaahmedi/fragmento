import ImpressumBackLink from "../../components/impressum-back-link";

export const metadata = {
  title: "Datenschutzerklärung | Fragmento Kitchen Configurator",
  description: "Informationen zur Verarbeitung personenbezogener Daten im Fragmento Kitchen Configurator.",
};

export default function DatenschutzPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__card">
        <p className="legal-page__eyebrow">Rechtliche Angaben</p>
        <ImpressumBackLink />
        <h1>Datenschutzerklärung</h1>

        <section className="legal-page__section">
          <h2>1. Verantwortlicher</h2>
          <p>
            architecto. by Küchen Aktuell GmbH
            <br />
            Senefelderstraße 2b
            <br />
            38124 Braunschweig
            <br />
            E-Mail: info@myarchitecto.de
          </p>
          <p>Datenschutzbeauftragter: datenschutzbeauftragter@myarchitecto.de</p>
        </section>

        <section className="legal-page__section">
          <h2>2. Bereitstellung und Sicherheit der Website</h2>
          <p>
            Beim Aufruf der Website wird die IP-Adresse technisch benötigt, um die angeforderten Inhalte an das
            Endgerät zu übertragen und die Anwendung gegen Missbrauch zu schützen. Die Anwendung speichert die
            vollständige IP-Adresse nicht in der Besuchsstatistik.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>3. Datenschutzfreundliche Reichweitenmessung</h2>
          <p>
            Wir erfassen in eigener Verantwortung, wie die Anwendung genutzt wird, um ihre Reichweite, technische
            Funktion und Bedienbarkeit zu prüfen. Die Auswertung erfolgt innerhalb unserer Anwendung; die
            IP-Adresse wird nicht an einen externen Geolokalisierungsdienst übermittelt.
          </p>
          <p>Hierbei können folgende Angaben verarbeitet werden:</p>
          <ul>
            <li>Zeitpunkt und Art des Ereignisses, zum Beispiel Seitenaufruf oder Vertragsprüfung,</li>
            <li>aufgerufener Anwendungsbereich,</li>
            <li>aus der IP-Adresse lokal abgeleiteter zweistelliger Ländercode,</li>
            <li>Quelle, UTM-Medium, UTM-Kampagne und Domain der verweisenden Website, soweit vorhanden,</li>
            <li>grobe Geräteklasse sowie Browser- und Betriebssystemfamilie ohne Versionsnummern,</li>
            <li>
              ein täglich wechselnder, nicht rückrechenbarer Kennwert zur Schätzung täglicher eindeutiger
              Besuche.
            </li>
          </ul>
          <p>
            Nicht gespeichert werden die vollständige IP-Adresse, ein genauer Standort, Stadt, Postleitzahl,
            Koordinaten, Internetanbieter oder die vollständige User-Agent-Zeichenfolge. Die Messung setzt keinen
            zusätzlichen Analyse-Cookie. Aktivierte Signale „Do Not Track“ oder „Global Privacy Control“ werden
            bei allgemeinen Seitenaufrufen berücksichtigt.
          </p>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unsere berechtigten Interessen liegen in der
            Reichweitenmessung, Fehlererkennung, Missbrauchsprävention und Verbesserung der Anwendung. Detaillierte
            Besuchsereignisse werden grundsätzlich nach 90 Tagen automatisch gelöscht.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>4. Prüfung einer Vertragsnummer</h2>
          <p>
            Bei der Eingabe einer Vertragsnummer verarbeiten wir die Angabe, um den Zugang zur zugeordneten Küche
            zu prüfen und die gewünschten vorvertraglichen oder vertraglichen Funktionen bereitzustellen. Bei einer
            gültigen Vertragsnummer kann das Zugriffsereignis mit dem internen Vertrag, der Küche und dem Projekt
            verknüpft werden. Bei einer ungültigen Eingabe wird keine Verknüpfung mit einer Person oder einem
            Projekt hergestellt; gespeichert werden lediglich ein nicht rückrechenbarer Prüfwert und höchstens die
            letzten vier Zeichen zur Fehler- und Missbrauchsanalyse.
          </p>
          <p>
            Rechtsgrundlagen sind, soweit die Verarbeitung zur Durchführung vorvertraglicher oder vertraglicher
            Maßnahmen erforderlich ist, Art. 6 Abs. 1 lit. b DSGVO sowie für Sicherheits- und Fehleranalysen
            Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>5. Empfänger und Hosting</h2>
          <p>
            Die Anwendung wird auf einem Server der Hetzner Online GmbH betrieben. Zugriff auf die Auswertungen
            erhalten nur hierzu berechtigte Administratoren und eingesetzte Auftragsverarbeiter, soweit dies für
            Betrieb, Wartung oder Support erforderlich ist.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>6. Ihre Rechte</h2>
          <p>
            Sie haben nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung,
            Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Gegen eine Verarbeitung auf Grundlage
            von Art. 6 Abs. 1 lit. f DSGVO können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben,
            Widerspruch einlegen. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>7. Stand</h2>
          <p>Stand: 16. Juli 2026</p>
        </section>
      </div>
    </main>
  );
}
