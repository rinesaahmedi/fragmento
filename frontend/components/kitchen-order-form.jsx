"use client";

import { useMemo, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import { ADDRESS_VERIFICATION_STATUS } from "../lib/address-verification";
import { usePublicI18n } from "./public-i18n";

const PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Card" },
];

const PAYMENT_METHOD_STYLE_BY_VALUE = {
  card: "card",
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

const FIELD_ERROR_MESSAGES = {
  firstName: "Bitte Vorname eingeben.",
  lastName: "Bitte Nachname eingeben.",
  email: "Bitte E-Mail eingeben.",
  phone: "Bitte Telefonnummer eingeben.",
  address1: "Bitte Straße und Hausnummer eingeben.",
  country: "Bitte Land auswaehlen.",
  city: "Bitte Stadt auswaehlen.",
  postalCode: "Bitte PLZ auswaehlen.",
  paymentMethod: "Bitte Zahlungsmethode auswaehlen.",
  consent: "Bitte der Datenschutzerklaerung zustimmen.",
};

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function uniqueOptions(values = [], fallback = "") {
  return [...new Set([fallback, ...values].filter(Boolean))];
}

function contractCountryToCustomerCountry(country) {
  if (!country) return "";
  return Object.entries(COUNTRY_LABELS).find(([, englishLabel]) => englishLabel === country)?.[0] || country;
}

function formatCountryLabel(country, translate) {
  const normalizedCountry = contractCountryToCustomerCountry(country);
  return translate(`countries.${normalizedCountry}`, COUNTRY_LABELS[normalizedCountry] || country || "");
}

function buildAddressLines(address, translate) {
  return [
    [address?.address1, address?.address2].filter(Boolean).join(", "),
    [address?.postalCode, address?.city].filter(Boolean).join(" "),
    formatCountryLabel(address?.country, translate),
  ].filter(Boolean);
}

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
  isUsingContractAddress,
  isSubmitting,
  status,
  statusTone,
  addressVerification,
  onSubmit,
  onVerifyAddress,
  onUpdateCustomer,
  onToggleUseContractAddress,
}) {
  const { translate } = usePublicI18n();
  const [touchedFields, setTouchedFields] = useState({});
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const fieldErrorMessages = useMemo(() => ({
    firstName: translate("order.fieldErrors.firstName", "Please enter the first name."),
    lastName: translate("order.fieldErrors.lastName", "Please enter the last name."),
    email: translate("order.fieldErrors.email", "Please enter the email address."),
    phone: translate("order.fieldErrors.phone", "Please enter the phone number."),
    address1: translate("order.fieldErrors.address1", "Please enter the street and house number."),
    country: translate("order.fieldErrors.country", "Please select a country."),
    city: translate("order.fieldErrors.city", "Please select a city."),
    postalCode: translate("order.fieldErrors.postalCode", "Please select a postal code."),
    paymentMethod: translate("order.fieldErrors.paymentMethod", "Please choose a payment method."),
    consent: translate("order.fieldErrors.consent", "Please accept the privacy statement."),
  }), [translate]);
  const countryOptions = uniqueOptions(Object.keys(COUNTRY_CITY_OPTIONS), customer.country);
  const cityOptions = uniqueOptions(COUNTRY_CITY_OPTIONS[customer.country] || [], customer.city);
  const postalCodeOptions = uniqueOptions(POSTAL_CODE_OPTIONS[customer.city] || [], customer.postalCode);
  const contractAddressLines = buildAddressLines(contractAddress, translate);
  const canUseContractAddress = contractAddressLines.length > 0;
  const addressVerificationStatus = addressVerification?.status || ADDRESS_VERIFICATION_STATUS.IDLE;
  const addressVerificationMessage = addressVerification?.message || "";
  const addressVerificationSuggestion = addressVerification?.suggestion || "";
  const isAddressVerificationLoading = addressVerificationStatus === ADDRESS_VERIFICATION_STATUS.LOADING;
  const isAddressVerificationValid = addressVerificationStatus === ADDRESS_VERIFICATION_STATUS.VALID;
  const isAddressVerificationPartial = addressVerificationStatus === ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH;
  const isAddressVerificationError =
    addressVerificationStatus === ADDRESS_VERIFICATION_STATUS.INVALID
    || addressVerificationStatus === ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE;
  const hasVerificationResult = addressVerificationStatus !== ADDRESS_VERIFICATION_STATUS.IDLE;

  function markFieldTouched(fieldKey) {
    setTouchedFields((current) => (current[fieldKey] ? current : { ...current, [fieldKey]: true }));
  }

  function hasFieldError(fieldKey, required = false) {
    if (!required) return false;
    if (!hasTriedSubmit && !touchedFields[fieldKey]) return false;
    return fieldKey === "consent" ? !customer.consent : !normalizeValue(customer[fieldKey]);
  }

  function getFieldClassName(fieldKey, required = false, baseClassName = styles.field) {
    return [
      baseClassName,
      hasFieldError(fieldKey, required) ? styles.fieldInvalid : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function renderFieldError(fieldKey, required = false) {
    if (!hasFieldError(fieldKey, required)) return null;

    return (
      <span className={styles.fieldError} role="alert">
        {fieldErrorMessages[fieldKey] || translate("order.fieldRequired", "This field is required.")}
      </span>
    );
  }

  function handleFormSubmit(event) {
    setHasTriedSubmit(true);
    onSubmit(event);
  }

  return (
    <section ref={orderSectionRef} className={styles.orderSectionWrap}>
      <div className={styles.orderPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>{translate("order.title", "Complete order")}</h2>
          </div>
        </div>
        <form
          id="order-form"
          className={styles.orderForm}
          autoComplete="on"
          onSubmit={handleFormSubmit}
          onInvalidCapture={() => setHasTriedSubmit(true)}
        >
          <input
            id="contractNumber"
            type="hidden"
            value={customer.contractNumber}
            readOnly
          />
          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>{translate("order.contactPersonTitle", "Contact person")}</h3>
                <p>{translate("order.contactPersonHelp", "Who is ordering?")}</p>
              </div>
            </div>
            <div className={styles.sectionFields}>
              <div className={getFieldClassName("firstName", true, styles.field)}>
                <label htmlFor="firstName">{translate("order.firstName", "First name*")}</label>
                <input
                  id="firstName"
                  name="given-name"
                  autoComplete="given-name"
                  required
                  placeholder="Max"
                  value={customer.firstName}
                  onBlur={() => markFieldTouched("firstName")}
                  onChange={(event) => onUpdateCustomer("firstName", event.target.value)}
                  aria-invalid={hasFieldError("firstName", true)}
                />
                {renderFieldError("firstName", true)}
              </div>
              <div className={getFieldClassName("lastName", true, styles.field)}>
                <label htmlFor="lastName">{translate("order.lastName", "Last name*")}</label>
                <input
                  id="lastName"
                  name="family-name"
                  autoComplete="family-name"
                  required
                  placeholder="Mustermann"
                  value={customer.lastName}
                  onBlur={() => markFieldTouched("lastName")}
                  onChange={(event) => onUpdateCustomer("lastName", event.target.value)}
                  aria-invalid={hasFieldError("lastName", true)}
                />
                {renderFieldError("lastName", true)}
              </div>
              <div className={getFieldClassName("email", true, styles.field)}>
                <label htmlFor="email">{translate("order.email", "Email*")}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="max@example.com"
                  value={customer.email}
                  onBlur={() => markFieldTouched("email")}
                  onChange={(event) => onUpdateCustomer("email", event.target.value)}
                  aria-invalid={hasFieldError("email", true)}
                />
                {renderFieldError("email", true)}
              </div>
              <div className={getFieldClassName("phone", true, styles.field)}>
                <label htmlFor="phone">{translate("order.phone", "Phone*")}</label>
                <input
                  id="phone"
                  name="tel"
                  autoComplete="tel"
                  required
                  placeholder="+49 170 1234567"
                  value={customer.phone}
                  onBlur={() => markFieldTouched("phone")}
                  onChange={(event) => onUpdateCustomer("phone", event.target.value)}
                  aria-invalid={hasFieldError("phone", true)}
                />
                {renderFieldError("phone", true)}
              </div>
            </div>
          </div>

          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>{translate("order.addressTitle", "Order / billing address")}</h3>
                <p>{translate("order.addressHelp", "Choose whether the contract address should be used for this order.")}</p>
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                id="use-object-address"
                type="checkbox"
                checked={isUsingContractAddress}
                disabled={!canUseContractAddress}
                onChange={(event) => onToggleUseContractAddress(event.target.checked)}
              />
              <label htmlFor="use-object-address">
                {translate("order.useContractAddress", "Use the property address as the order / billing address")}
              </label>
            </div>
            {isUsingContractAddress ? (
              <p className={styles.sectionHint}>{translate("order.usingContractAddress", "The contract address will be used for this order.")}</p>
            ) : (
              <div className={styles.sectionFields}>
                <div className={getFieldClassName("address1", true, styles.fieldFull)}>
                  <label htmlFor="address1">Adresse (Straße, Nr.)*</label>
                  <input
                    id="address1"
                    name="address-line1"
                    autoComplete="address-line1"
                    required
                    placeholder="Musterstraße 1"
                    value={customer.address1}
                    onBlur={() => markFieldTouched("address1")}
                    onChange={(event) => onUpdateCustomer("address1", event.target.value)}
                    aria-invalid={hasFieldError("address1", true)}
                  />
                  {renderFieldError("address1", true)}
                </div>
                <div className={getFieldClassName("address2", false, styles.fieldFull)}>
                  <label htmlFor="address2">Adresszusatz</label>
                  <input
                    id="address2"
                    name="address-line2"
                    autoComplete="address-line2"
                    placeholder="Wohnung, Firma, etc."
                    value={customer.address2}
                    onBlur={() => markFieldTouched("address2")}
                    onChange={(event) => onUpdateCustomer("address2", event.target.value)}
                  />
                </div>
                <div className={getFieldClassName("country", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="country">Land*</label>
                  <select
                    id="country"
                    name="country"
                    autoComplete="country-name"
                    required
                    value={customer.country}
                    onBlur={() => markFieldTouched("country")}
                    onChange={(event) => {
                      const nextCountry = event.target.value;
                      onUpdateCustomer("country", nextCountry);
                      onUpdateCustomer("city", "");
                      onUpdateCustomer("postalCode", "");
                    }}
                    aria-invalid={hasFieldError("country", true)}
                  >
                    <option value="">Land auswaehlen</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>{COUNTRY_LABELS[country] || country}</option>
                    ))}
                  </select>
                  {renderFieldError("country", true)}
                </div>
                <div className={getFieldClassName("city", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="city">Stadt*</label>
                  <select
                    id="city"
                    name="address-level2"
                    autoComplete="address-level2"
                    required
                    value={customer.city}
                    disabled={!customer.country}
                    onBlur={() => markFieldTouched("city")}
                    onChange={(event) => {
                      onUpdateCustomer("city", event.target.value);
                      onUpdateCustomer("postalCode", "");
                    }}
                    aria-invalid={hasFieldError("city", true)}
                  >
                    <option value="">{customer.country ? "Stadt auswaehlen" : "Zuerst Land auswaehlen"}</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {renderFieldError("city", true)}
                </div>
                <div className={getFieldClassName("postalCode", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="postalCode">PLZ*</label>
                  <select
                    id="postalCode"
                    name="postal-code"
                    autoComplete="postal-code"
                    required
                    value={customer.postalCode}
                    disabled={!customer.city}
                    onBlur={() => markFieldTouched("postalCode")}
                    onChange={(event) => onUpdateCustomer("postalCode", event.target.value)}
                    aria-invalid={hasFieldError("postalCode", true)}
                  >
                    <option value="">{customer.city ? "PLZ auswaehlen" : "Zuerst Stadt auswaehlen"}</option>
                    {postalCodeOptions.map((postalCode) => (
                      <option key={postalCode} value={postalCode}>{postalCode}</option>
                    ))}
                  </select>
                  {renderFieldError("postalCode", true)}
                </div>
              </div>
            )}
          </div>

          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>Address verification</h3>
              </div>
            </div>
            <div className={styles.addressVerificationRow}>
              <div className={styles.addressVerificationContent}>
                {hasVerificationResult ? (
                  <div
                    className={[
                      styles.addressVerificationMessage,
                      isAddressVerificationValid ? styles.addressVerificationMessageValid : "",
                      isAddressVerificationPartial ? styles.addressVerificationMessageWarning : "",
                      isAddressVerificationError ? styles.addressVerificationMessageError : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="status"
                    aria-live="polite"
                  >
                    {addressVerificationMessage ? <strong>{addressVerificationMessage}</strong> : null}
                    {addressVerificationSuggestion ? <span>Suggested match: {addressVerificationSuggestion}</span> : null}
                    {isAddressVerificationPartial ? <span>Please review the street and verify again if needed.</span> : null}
                    {isAddressVerificationError ? <span>Correct the address details and run verification again.</span> : null}
                  </div>
                ) : (
                  <p className={styles.sectionHint}>Please verify the address before submitting the order.</p>
                )}
              </div>
              <button
                type="button"
                className={[
                  styles.verifyAddressButton,
                  isAddressVerificationValid ? styles.verifyAddressButtonValid : "",
                  isAddressVerificationPartial ? styles.verifyAddressButtonWarning : "",
                  isAddressVerificationError ? styles.verifyAddressButtonError : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={onVerifyAddress}
                disabled={isAddressVerificationLoading}
              >
                {isAddressVerificationLoading ? "Verifying..." : "Verify address"}
              </button>
            </div>
          </div>

          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>Payment + Consent</h3>
                <p>Waehle eine Zahlungsmethode, hinterlasse optional Hinweise und bestaetige den Datenschutz.</p>
              </div>
            </div>
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
                        hasFieldError("paymentMethod", true) ? styles.paymentOptionInvalid : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        markFieldTouched("paymentMethod");
                        onUpdateCustomer("paymentMethod", option.value);
                      }}
                      onBlur={() => markFieldTouched("paymentMethod")}
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
              {renderFieldError("paymentMethod", true)}
            </div>
            <div className={styles.sectionFields}>
              <div className={styles.fieldFull}>
                <label htmlFor="notes">Anmerkungen (optional)</label>
                <textarea
                  id="notes"
                  rows="3"
                  value={customer.notes}
                  onBlur={() => markFieldTouched("notes")}
                  onChange={(event) => onUpdateCustomer("notes", event.target.value)}
                  placeholder="Hinweise zur Lieferung, Wunschtermine, etc."
                />
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                id="consent"
                type="checkbox"
                checked={customer.consent}
                onBlur={() => markFieldTouched("consent")}
                onChange={(event) => {
                  markFieldTouched("consent");
                  onUpdateCustomer("consent", event.target.checked);
                }}
              />
              <label htmlFor="consent">
                Ich stimme der Verarbeitung meiner Daten zum Zweck der Bestellung zu.*
              </label>
            </div>
            {renderFieldError("consent", true)}
            <div className={styles.orderSubmitRow}>
              <button type="submit" form="order-form" className={styles.orderSubmitButton} disabled={isSubmitting}>
                {isSubmitting ? "Wird gespeichert..." : "Bestellung einreichen"}
              </button>
            </div>
            <small className={styles.orderHelp}>Mit * gekennzeichnete Felder sind Pflichtfelder.</small>
          </div>
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
