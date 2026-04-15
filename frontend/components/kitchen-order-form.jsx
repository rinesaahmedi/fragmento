"use client";

import styles from "./kitchen-configurator.module.css";

const PAYMENT_METHOD_OPTIONS = [
  { value: "paypal", label: "PayPal" },
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "klarna", label: "Klarna" },
];

const PAYMENT_METHOD_STYLE_BY_VALUE = {
  paypal: "paypal",
  visa: "visa",
  mastercard: "mastercard",
  klarna: "klarna",
};

const COUNTRY_LABELS = {
  Deutschland: "Germany",
  Oesterreich: "Austria",
  Schweiz: "Switzerland",
  Ungarn: "Hungary",
  Kosovo: "Kosovo",
  Tschechien: "Czechia",
  Slowakei: "Slovakia",
  Polen: "Poland",
};

export const COUNTRY_CITY_OPTIONS = {
  Deutschland: [
    "Aachen",
    "Augsburg",
    "Berlin",
    "Bielefeld",
    "Bochum",
    "Bonn",
    "Braunschweig",
    "Bremen",
    "Chemnitz",
    "Dortmund",
    "Dresden",
    "Duisburg",
    "Duesseldorf",
    "Erfurt",
    "Essen",
    "Frankfurt am Main",
    "Freiburg im Breisgau",
    "Gelsenkirchen",
    "Hamburg",
    "Hannover",
    "Karlsruhe",
    "Kassel",
    "Kiel",
    "Koeln",
    "Leipzig",
    "Luebeck",
    "Magdeburg",
    "Mainz",
    "Mannheim",
    "Moenchengladbach",
    "Muenchen",
    "Muenster",
    "Nuernberg",
    "Oberhausen",
    "Potsdam",
    "Regensburg",
    "Rostock",
    "Saarbruecken",
    "Stuttgart",
    "Wiesbaden",
    "Wuppertal",
  ],
  Oesterreich: ["Graz", "Innsbruck", "Klagenfurt", "Linz", "Salzburg", "Sankt Poelten", "Vienna", "Wels", "Wien"],
  Schweiz: ["Basel", "Bern", "Geneva", "Lausanne", "Lugano", "Lucerne", "St. Gallen", "Winterthur", "Zurich"],
  Ungarn: ["Budapest", "Debrecen", "Gyor", "Miskolc", "Pecs", "Szeged"],
  Kosovo: ["Ferizaj", "Gjakova", "Gjilan", "Mitrovica", "Peja", "Prishtina", "Prizren"],
  Tschechien: ["Brno", "Ostrava", "Plzen", "Prague"],
  Slowakei: ["Bratislava", "Kosice", "Nitra", "Zilina"],
  Polen: ["Gdansk", "Katowice", "Krakow", "Lodz", "Poznan", "Warsaw", "Wroclaw"],
};

export const POSTAL_CODE_OPTIONS = {
  Aachen: ["52062", "52064", "52066", "52068", "52070", "52072", "52074", "52076", "52078", "52080"],
  Augsburg: ["86150", "86152", "86153", "86154", "86156", "86157", "86159", "86161", "86163", "86165", "86167", "86169", "86179", "86199"],
  Berlin: ["10115", "10117", "10119", "10178", "10179", "10243", "10245", "10247", "10249", "10315", "10317", "10318", "10319", "10405", "10407", "10409", "10435", "10437", "10439", "10551", "10553", "10555", "10557", "10559", "10585", "10587", "10589", "10623", "10625", "10627", "10629", "10707", "10709", "10711", "10713", "10715", "10717", "10719", "10777", "10779", "10781", "10783", "10785", "10787", "10789", "10823", "10825", "10827", "10829", "10961", "10963", "10965", "10967", "10969", "10997", "10999", "12043", "12045", "12047", "12049", "12051", "12053", "12055", "12057", "12059", "12099", "12101", "12103", "12105", "12107", "12109", "12157", "12159", "12161", "12163", "12165", "12167", "12169"],
  Bielefeld: ["33602", "33604", "33605", "33607", "33609", "33611", "33613", "33615", "33617", "33619"],
  Bochum: ["44787", "44789", "44791", "44793", "44795", "44797", "44799", "44801", "44803", "44805"],
  Bonn: ["53111", "53113", "53115", "53117", "53119", "53121", "53123", "53125", "53127", "53129"],
  Braunschweig: ["38100", "38102", "38104", "38106", "38108", "38110", "38112", "38114", "38116", "38118", "38120", "38122", "38124", "38126"],
  Bremen: ["28195", "28197", "28199", "28201", "28203", "28205", "28207", "28209", "28211", "28213"],
  Chemnitz: ["09111", "09112", "09113", "09114", "09116", "09117", "09119", "09120", "09122", "09123"],
  Dortmund: ["44135", "44137", "44139", "44141", "44143", "44145", "44147", "44149", "44225", "44227", "44229", "44263", "44265", "44267", "44269", "44287", "44289", "44309", "44319", "44328", "44329", "44339", "44357", "44359", "44369", "44379", "44388"],
  Dresden: ["01067", "01069", "01097", "01099", "01109", "01127", "01129", "01139", "01157", "01159"],
  Duisburg: ["47051", "47053", "47055", "47057", "47058", "47059", "47119", "47137", "47138", "47139"],
  Duesseldorf: ["40210", "40211", "40212", "40213", "40215", "40217", "40219", "40221", "40223", "40225"],
  Erfurt: ["99084", "99085", "99086", "99087", "99089", "99091", "99092", "99094", "99096", "99097"],
  Essen: ["45127", "45128", "45130", "45131", "45133", "45134", "45136", "45138", "45139", "45141"],
  "Frankfurt am Main": ["60311", "60313", "60314", "60316", "60318", "60320", "60322", "60323", "60325", "60326"],
  "Freiburg im Breisgau": ["79098", "79100", "79102", "79104", "79106", "79108", "79110", "79111", "79112", "79114"],
  Gelsenkirchen: ["45879", "45881", "45883", "45884", "45886", "45888", "45889", "45891", "45892", "45894"],
  Hamburg: ["20095", "20097", "20099", "20144", "20146", "20148", "20149", "20249", "20251", "20253"],
  Hannover: ["30159", "30161", "30163", "30165", "30167", "30169", "30171", "30173", "30175", "30177"],
  Karlsruhe: ["76131", "76133", "76135", "76137", "76139", "76149", "76185", "76187", "76189", "76199"],
  Kassel: ["34117", "34119", "34121", "34123", "34125", "34127", "34128", "34130", "34131", "34132"],
  Kiel: ["24103", "24105", "24106", "24107", "24109", "24111", "24113", "24114", "24116", "24118"],
  Koeln: ["50667", "50668", "50670", "50672", "50674", "50676", "50677", "50678", "50679", "50733"],
  Leipzig: ["04103", "04105", "04107", "04109", "04129", "04155", "04157", "04158", "04159", "04177"],
  Luebeck: ["23552", "23554", "23556", "23558", "23560", "23562", "23564", "23566", "23568", "23569"],
  Magdeburg: ["39104", "39106", "39108", "39110", "39112", "39114", "39116", "39118", "39120", "39122"],
  Mainz: ["55116", "55118", "55120", "55122", "55124", "55126", "55127", "55128", "55129", "55130"],
  Mannheim: ["68159", "68161", "68163", "68165", "68167", "68169", "68199", "68219", "68229", "68239"],
  Moenchengladbach: ["41061", "41063", "41065", "41066", "41068", "41069", "41169", "41179", "41189", "41199"],
  Muenchen: ["80331", "80333", "80335", "80336", "80337", "80339", "80469", "80538", "80539", "80634"],
  Muenster: ["48143", "48145", "48147", "48149", "48151", "48153", "48155", "48157", "48159", "48161"],
  Nuernberg: ["90402", "90403", "90408", "90409", "90411", "90419", "90425", "90427", "90429", "90431"],
  Oberhausen: ["46045", "46047", "46049", "46117", "46119", "46145", "46147", "46149"],
  Potsdam: ["14467", "14469", "14471", "14473", "14476", "14478", "14480", "14482"],
  Regensburg: ["93047", "93049", "93051", "93053", "93055", "93057", "93059"],
  Rostock: ["18055", "18057", "18059", "18069", "18106", "18107", "18109", "18119"],
  Saarbruecken: ["66111", "66113", "66115", "66117", "66119", "66121", "66123", "66125"],
  Stuttgart: ["70173", "70174", "70176", "70178", "70180", "70182", "70184", "70186", "70188", "70190"],
  Wiesbaden: ["65183", "65185", "65187", "65189", "65191", "65193", "65195", "65197", "65199", "65201"],
  Wuppertal: ["42103", "42105", "42107", "42109", "42111", "42113", "42115", "42117", "42119", "42275"],
  Graz: ["8010", "8020", "8036", "8041", "8042", "8051", "8052", "8053", "8054", "8055"],
  Innsbruck: ["6020"],
  Klagenfurt: ["9020"],
  Linz: ["4020", "4030", "4040"],
  Salzburg: ["5020"],
  "Sankt Poelten": ["3100"],
  Vienna: ["1010", "1020", "1030", "1040", "1050", "1060", "1070", "1080", "1090", "1100", "1110", "1120", "1130", "1140", "1150", "1160", "1170", "1180", "1190", "1200", "1210", "1220", "1230"],
  Wels: ["4600"],
  Wien: ["1010", "1020", "1030", "1040", "1050", "1060", "1070", "1080", "1090", "1100", "1110", "1120", "1130", "1140", "1150", "1160", "1170", "1180", "1190", "1200", "1210", "1220", "1230"],
  Basel: ["4001", "4002", "4003", "4004", "4005", "4007", "4051", "4052", "4053", "4054", "4055", "4056", "4057", "4058"],
  Bern: ["3000", "3004", "3005", "3006", "3007", "3011", "3012", "3013", "3014", "3015", "3018"],
  Geneva: ["1201", "1202", "1203", "1204", "1205", "1206", "1207", "1208", "1209"],
  Lausanne: ["1003", "1004", "1005", "1006", "1007"],
  Lugano: ["6900"],
  Lucerne: ["6003", "6004", "6005", "6006"],
  "St. Gallen": ["9000", "9008"],
  Winterthur: ["8400", "8404", "8405", "8406", "8408", "8409"],
  Zurich: ["8001", "8002", "8003", "8004", "8005", "8006", "8008", "8032", "8044", "8050"],
  Budapest: ["1011", "1021", "1031", "1041", "1051", "1061", "1071", "1081", "1091", "1101", "1111", "1121", "1131", "1141"],
  Debrecen: ["4024", "4025", "4026", "4027", "4028", "4030", "4031", "4032"],
  Gyor: ["9021", "9022", "9023", "9024", "9025", "9026", "9027", "9028"],
  Miskolc: ["3525", "3526", "3527", "3528", "3529", "3530"],
  Pecs: ["7621", "7622", "7623", "7624", "7630"],
  Szeged: ["6720", "6721", "6722", "6723", "6724", "6725", "6726"],
  Ferizaj: ["70000"],
  Gjakova: ["50000"],
  Gjilan: ["60000"],
  Mitrovica: ["40000"],
  Peja: ["30000"],
  Prishtina: ["10000"],
  Prizren: ["20000"],
  Brno: ["60200"],
  Ostrava: ["70200", "70300", "70800"],
  Plzen: ["30100"],
  Prague: ["11000", "12000", "13000", "14000", "15000", "16000", "17000", "18000", "19000"],
  Bratislava: ["81101", "81102", "81103", "81104", "81105", "82101", "83101", "84101", "85101"],
  Kosice: ["04001", "04011", "04012", "04013", "04014", "04015", "04016"],
  Nitra: ["94901"],
  Zilina: ["01001"],
  Gdansk: ["80-001", "80-008", "80-009", "80-011", "80-018", "80-021"],
  Katowice: ["40-001", "40-003", "40-004", "40-007", "40-008", "40-009"],
  Krakow: ["30-001", "30-002", "30-003", "30-004", "30-005", "31-001"],
  Lodz: ["90-001", "90-002", "90-003", "90-004", "90-005", "91-001"],
  Poznan: ["60-001", "60-002", "60-003", "60-004", "60-005", "61-001"],
  Warsaw: ["00-001", "00-002", "00-003", "00-004", "00-005", "01-001"],
  Wroclaw: ["50-001", "50-002", "50-003", "50-004", "50-005", "51-001"],
};

export default function KitchenOrderForm({
  orderSectionRef,
  customer,
  contractAddress,
  isSubmitting,
  status,
  statusTone,
  onSubmit,
  onUpdateCustomer,
}) {
  const countryOptions = Object.keys(COUNTRY_CITY_OPTIONS);
  const cityOptions = COUNTRY_CITY_OPTIONS[customer.country] || [];
  const postalCodeOptions = POSTAL_CODE_OPTIONS[customer.city] || [];
  const contractAddressLines = [
    [contractAddress?.address1, contractAddress?.address2].filter(Boolean).join(", "),
    [contractAddress?.postalCode, contractAddress?.city].filter(Boolean).join(" "),
    contractAddress?.country || "",
    contractAddress?.unitLabel || "",
    contractAddress?.notes ? `Notes: ${contractAddress.notes}` : "",
  ].filter(Boolean);

  return (
    <section ref={orderSectionRef} className={styles.orderSectionWrap}>
      <div className={styles.orderPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Bestellung abschliessen</h2>
            <p className={styles.panelIntro}>
              Gib deine Kontaktdaten ein. Wir senden dir eine Bestellbestaetigung per E-Mail.
            </p>
          </div>
        </div>
        {contractAddressLines.length ? (
          <div className={styles.contractAddressBox}>
            <strong>Adresse zu dieser Vertragsnummer</strong>
            {contractAddressLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ) : null}
        <form id="order-form" className={styles.orderForm} onSubmit={onSubmit}>
          <input
            id="contractNumber"
            type="hidden"
            value={customer.contractNumber}
            onChange={(event) => onUpdateCustomer("contractNumber", event.target.value)}
          />
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="firstName">Vorname*</label>
            <input id="firstName" required placeholder="Max" value={customer.firstName} onChange={(event) => onUpdateCustomer("firstName", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="lastName">Nachname*</label>
            <input id="lastName" required placeholder="Mustermann" value={customer.lastName} onChange={(event) => onUpdateCustomer("lastName", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="email">E-Mail*</label>
            <input id="email" type="email" required placeholder="max@example.com" value={customer.email} onChange={(event) => onUpdateCustomer("email", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="phone">Telefon*</label>
            <input id="phone" required placeholder="+49 170 1234567" value={customer.phone} onChange={(event) => onUpdateCustomer("phone", event.target.value)} />
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="address1">Adresse (Straße, Nr.)*</label>
            <input id="address1" required placeholder="Musterstraße 1" value={customer.address1} onChange={(event) => onUpdateCustomer("address1", event.target.value)} />
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="address2">Adresszusatz (optional)</label>
            <input id="address2" placeholder="Wohnung, Firma, etc." value={customer.address2} onChange={(event) => onUpdateCustomer("address2", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="country">Land*</label>
            <select
              id="country"
              required
              value={customer.country}
              onChange={(event) => {
                const nextCountry = event.target.value;
                onUpdateCustomer("country", nextCountry);
                onUpdateCustomer("city", "");
                onUpdateCustomer("postalCode", "");
              }}
            >
              <option value="">Land auswaehlen</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>{COUNTRY_LABELS[country] || country}</option>
              ))}
            </select>
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="city">Stadt*</label>
            <select
              id="city"
              required
              value={customer.city}
              disabled={!customer.country}
              onChange={(event) => {
                onUpdateCustomer("city", event.target.value);
                onUpdateCustomer("postalCode", "");
              }}
            >
              <option value="">{customer.country ? "Stadt auswaehlen" : "Zuerst Land auswaehlen"}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="postalCode">PLZ*</label>
            <select
              id="postalCode"
              required
              value={customer.postalCode}
              disabled={!customer.city}
              onChange={(event) => onUpdateCustomer("postalCode", event.target.value)}
            >
              <option value="">{customer.city ? "PLZ auswaehlen" : "Zuerst Stadt auswaehlen"}</option>
              {postalCodeOptions.map((postalCode) => (
                <option key={postalCode} value={postalCode}>{postalCode}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="notes">Anmerkungen (optional)</label>
            <textarea
              id="notes"
              rows="3"
              value={customer.notes}
              onChange={(event) => onUpdateCustomer("notes", event.target.value)}
              placeholder="Hinweise zur Lieferung, Wunschtermine, etc."
            />
          </div>
          <div className={styles.checkboxRow}>
            <input
              id="consent"
              type="checkbox"
              checked={customer.consent}
              onChange={(event) => onUpdateCustomer("consent", event.target.checked)}
            />
            <label htmlFor="consent">
              Ich stimme der Verarbeitung meiner Daten zum Zweck der Bestellung zu.*
            </label>
          </div>
          <div className={styles.fieldFull}>
            <div className={styles.paymentSection}>
              <label>Zahlungsmethode auswaehlen*</label>
              <div className={styles.paymentOptions} role="radiogroup" aria-label="Zahlungsmethode">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const selected = customer.paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        styles.paymentOption,
                        selected ? styles.paymentOptionSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onUpdateCustomer("paymentMethod", option.value)}
                      aria-pressed={selected}
                    >
                      <span
                        className={[
                          styles.paymentLogo,
                          styles[`paymentLogo${PAYMENT_METHOD_STYLE_BY_VALUE[option.value]?.charAt(0).toUpperCase()}${PAYMENT_METHOD_STYLE_BY_VALUE[option.value]?.slice(1)}`],
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className={styles.paymentLogoLabel}>{option.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.orderSubmitRow}>
            <button type="submit" form="order-form" className={styles.orderSubmitButton} disabled={isSubmitting}>
              {isSubmitting ? "Wird gesendet..." : "Bestellbestaetigung senden"}
            </button>
          </div>
          <small className={styles.orderHelp}>Mit * gekennzeichnete Felder sind Pflichtfelder.</small>
        </form>

        <div
          className={[
            styles.status,
            statusTone === "error" ? styles.statusError : "",
            statusTone === "success" ? styles.statusSuccess : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status}
        </div>
      </div>
    </section>
  );
}
