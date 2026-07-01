import ImpressumBackLink from "../../components/impressum-back-link";

export const metadata = {
  title: "Impressum | Fragmento Kitchen Configurator",
  description: "Impressum und Anbieterkennzeichnung für den Fragmento Kitchen Configurator.",
};

export default function ImpressumPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__card">
        <p className="legal-page__eyebrow">Rechtliche Angaben</p>
        <ImpressumBackLink />
        <h1>Impressum</h1>

        <section className="legal-page__section">
          <h2>Anbieterkennzeichnung</h2>
          <p>
            architecto. by Küchen Aktuell GmbH
            <br />
            Senefelderstraße 2b
            <br />
            38124 Braunschweig
          </p>
        </section>

        <section className="legal-page__section">
          <h2>Kontakt</h2>
          <p>
            Telefon: 0531 / 261 34 - 1011
            <br />
            Telefax: 0531 / 261 34 - 2299
            <br />
            E-Mail: info@myarchitecto.de
            <br />
            Internet: www.myarchitecto.de
          </p>
        </section>

        <section className="legal-page__section">
          <h2>Registereintrag</h2>
          <p>
            Registergericht: Amtsgericht Braunschweig
            <br />
            Registernummer: HRB 211013
          </p>
        </section>

        <section className="legal-page__section">
          <h2>Umsatzsteuer-ID</h2>
          <p>DE363172135</p>
        </section>

        <section className="legal-page__section">
          <h2>Geschäftsführer</h2>
          <p>Claus Kuepers, Andreas Puchta, Christoph Fughe, Emanuel Zaby</p>
        </section>

        <section className="legal-page__section">
          <h2>Datenschutzbeauftragter</h2>
          <p>datenschutzbeauftragter@myarchitecto.de</p>
        </section>

        <section className="legal-page__section">
          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>Andreas Puchta, zu erreichen wie oben angegeben</p>
        </section>

        <section className="legal-page__section">
          <h2>Streitbeilegung für Verbraucher</h2>
          <p>
            Die architecto. by KA GmbH ist grundsätzlich nicht verpflichtet und bereit, an
            Streitbeilegungsverfahren vor einer Schlichtungsstelle teilzunehmen. Die architecto. by KA GmbH wird
            sich jedoch nachdrücklich bemühen, einen Streitfall außergerichtlich zu lösen.
          </p>
        </section>

        <section className="legal-page__section">
          <h2>Bildnachweise</h2>
          <p>iStock, Adobe Stock, Pexels, Unsplash, architecto. GmbH, Archiv</p>
        </section>

        <section className="legal-page__section">
          <h2>Haftungsausschluss</h2>
          <h3>Inhalt des Onlineangebotes</h3>
          <p>
            Die bereitgestellten Informationen auf dieser Website wurden sorgfältig geprüft und werden
            regelmäßig aktualisiert. Jedoch kann keine Garantie dafür übernommen werden, dass alle Angaben zu
            jeder Zeit vollständig, richtig und in letzter Aktualität dargestellt sind. Dies gilt insbesondere
            für alle Links zu anderen Websites, auf die direkt oder indirekt verwiesen wird. Alle Angaben können
            ohne vorherige Ankündigung ergänzt, entfernt oder geändert werden.
          </p>
          <p>
            Der Inhalt dieser Website ist urheberrechtlich geschützt. Alle Rechte, auch die der Übersetzung, des
            Nachdrucks und der Vervielfaeltigung des Inhalts oder Teilen daraus, sind vorbehalten. Ohne schriftliche
            Genehmigung darf der Inhalt und das Bildmaterial dieser Seite in keiner Form reproduziert oder unter
            Verwendung elektronischer Systeme verarbeitet, vervielfaeltigt oder verbreitet werden.
          </p>
          <h3>Verweise auf unseren Seiten</h3>
          <p>
            Für alle Links auf der Website der architecto. by KA GmbH gilt: Wir möchten ausdrücklich betonen,
            dass wir keinerlei Einfluss auf die Gestaltung und die Inhalte der gelinkten Seiten haben. Deshalb
            distanzieren wir uns hiermit ausdruecklich von allen Inhalten aller gelinkten Seiten und machen uns ihre
            Inhalte nicht zu Eigen.
          </p>
          <p>
            Für illegale, fehlerhafte oder unvollständige Inhalte und insbesondere für Schäden, die aus der
            Nutzung oder Nichtnutzung mittels Link eingebundener Seiten entstehen, haftet allein der Anbieter der
            Seite, auf welche verwiesen wurde, nicht derjenige, der über Links auf die jeweilige Veröffentlichung
            lediglich verweist. Falls die Seite www.myarchitecto.de in Internetseiten Dritter mittels Hyperlink
            erreichbar ist, übernimmt die architecto. by KA GmbH für deren Verwendung in den Internetseiten Dritter
            keinerlei Verantwortung.
          </p>
          <h3>Bereitgestellte Downloads</h3>
          <p>
            Um zum Download bereitgestellte Dateien als PDF lesen und ausdrucken zu können, wird der Adobe Reader
            benötigt. Das Herunterladen und die Verwendung der Dateien erfolgt auf eigene Gefahr. Die architecto.
            by KA GmbH übernimmt ausdrücklich keine Gewährleistung oder Haftung für etwaige Schäden,
            Folgeschäden oder Ausfälle, die durch die bereitgestellten Dateien entstehen können.
          </p>
          <h3>Rechtswirksamkeit dieses Haftungsausschlusses/Nutzungsbedingungen</h3>
          <p>
            Dieser Haftungsausschluss ist als Teil des Internetangebotes zu betrachten, von dem aus auf diese Seite
            verwiesen wurde. Sofern Teile oder einzelne Formulierungen dieses Textes der geltenden Rechtslage nicht,
            nicht mehr oder nicht vollständig entsprechen sollten, bleiben die übrigen Teile des Dokumentes in
            ihrem Inhalt und ihrer Gültigkeit davon unberührt.
          </p>
          <p>
            Mit dem Besuch oder der Benutzung der Website der architecto. by KA GmbH erklären Sie sich mit diesen
            Nutzungsbestimmungen einverstanden.
          </p>
        </section>
      </div>
    </main>
  );
}
