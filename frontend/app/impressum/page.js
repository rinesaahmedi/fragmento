import ImpressumBackLink from "../../components/impressum-back-link";

export const metadata = {
  title: "Impressum | Fragmento Kitchen Configurator",
  description: "Impressum und Anbieterkennzeichnung fuer den Fragmento Kitchen Configurator.",
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
            architecto. by Kuechen Aktuell GmbH
            <br />
            Senefelderstrasse 2b
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
          <h2>Geschaeftsfuehrer</h2>
          <p>Claus Kuepers, Andreas Puchta, Christoph Fughe, Emanuel Zaby</p>
        </section>

        <section className="legal-page__section">
          <h2>Datenschutzbeauftragter</h2>
          <p>datenschutzbeauftragter@myarchitecto.de</p>
        </section>

        <section className="legal-page__section">
          <h2>Verantwortlich fuer den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>Andreas Puchta, zu erreichen wie oben angegeben</p>
        </section>

        <section className="legal-page__section">
          <h2>Streitbeilegung fuer Verbraucher</h2>
          <p>
            Die architecto. by KA GmbH ist grundsaetzlich nicht verpflichtet und bereit, an
            Streitbeilegungsverfahren vor einer Schlichtungsstelle teilzunehmen. Die architecto. by KA GmbH wird
            sich jedoch nachdruecklich bemuehen, einen Streitfall aussergerichtlich zu loesen.
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
            Die bereitgestellten Informationen auf dieser Website wurden sorgfaeltig geprueft und werden
            regelmaessig aktualisiert. Jedoch kann keine Garantie dafuer uebernommen werden, dass alle Angaben zu
            jeder Zeit vollstaendig, richtig und in letzter Aktualitaet dargestellt sind. Dies gilt insbesondere
            fuer alle Links zu anderen Websites, auf die direkt oder indirekt verwiesen wird. Alle Angaben koennen
            ohne vorherige Ankuendigung ergaenzt, entfernt oder geaendert werden.
          </p>
          <p>
            Der Inhalt dieser Website ist urheberrechtlich geschuetzt. Alle Rechte, auch die der Uebersetzung, des
            Nachdrucks und der Vervielfaeltigung des Inhalts oder Teilen daraus, sind vorbehalten. Ohne schriftliche
            Genehmigung darf der Inhalt und das Bildmaterial dieser Seite in keiner Form reproduziert oder unter
            Verwendung elektronischer Systeme verarbeitet, vervielfaeltigt oder verbreitet werden.
          </p>
          <h3>Verweise auf unseren Seiten</h3>
          <p>
            Fuer alle Links auf der Website der architecto. by KA GmbH gilt: Wir moechten ausdruecklich betonen,
            dass wir keinerlei Einfluss auf die Gestaltung und die Inhalte der gelinkten Seiten haben. Deshalb
            distanzieren wir uns hiermit ausdruecklich von allen Inhalten aller gelinkten Seiten und machen uns ihre
            Inhalte nicht zu Eigen.
          </p>
          <p>
            Fuer illegale, fehlerhafte oder unvollstaendige Inhalte und insbesondere fuer Schaeden, die aus der
            Nutzung oder Nichtnutzung mittels Link eingebundener Seiten entstehen, haftet allein der Anbieter der
            Seite, auf welche verwiesen wurde, nicht derjenige, der ueber Links auf die jeweilige Veroeffentlichung
            lediglich verweist. Falls die Seite www.myarchitecto.de in Internetseiten Dritter mittels Hyperlink
            erreichbar ist, uebernimmt die architecto. by KA GmbH fuer deren Verwendung in den Internetseiten Dritter
            keinerlei Verantwortung.
          </p>
          <h3>Bereitgestellte Downloads</h3>
          <p>
            Um zum Download bereitgestellte Dateien als PDF lesen und ausdrucken zu koennen, wird der Adobe Reader
            benoetigt. Das Herunterladen und die Verwendung der Dateien erfolgt auf eigene Gefahr. Die architecto.
            by KA GmbH uebernimmt ausdruecklich keine Gewaehrleistung oder Haftung fuer etwaige Schaeden,
            Folgeschaeden oder Ausfaelle, die durch die bereitgestellten Dateien entstehen koennen.
          </p>
          <h3>Rechtswirksamkeit dieses Haftungsausschlusses/Nutzungsbedingungen</h3>
          <p>
            Dieser Haftungsausschluss ist als Teil des Internetangebotes zu betrachten, von dem aus auf diese Seite
            verwiesen wurde. Sofern Teile oder einzelne Formulierungen dieses Textes der geltenden Rechtslage nicht,
            nicht mehr oder nicht vollstaendig entsprechen sollten, bleiben die uebrigen Teile des Dokumentes in
            ihrem Inhalt und ihrer Gueltigkeit davon unberuehrt.
          </p>
          <p>
            Mit dem Besuch oder der Benutzung der Website der architecto. by KA GmbH erklaeren Sie sich mit diesen
            Nutzungsbestimmungen einverstanden.
          </p>
        </section>
      </div>
    </main>
  );
}
