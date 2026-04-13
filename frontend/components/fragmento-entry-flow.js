"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "German", flagSrc: "https://flagcdn.com/w40/de.png" },
  { code: "en", label: "English", flagSrc: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "Turkish", flagSrc: "https://flagcdn.com/w40/tr.png" },
  { code: "es", label: "Spanish", flagSrc: "https://flagcdn.com/w40/es.png" },
  { code: "fr", label: "French", flagSrc: "https://flagcdn.com/w40/fr.png" },
  { code: "ru", label: "Russian", flagSrc: "https://flagcdn.com/w40/ru.png" },
];

const SCREEN_TEXT = {
  de: {
    languageTitle: "Waehle deine Sprache",
    modeTitle: "Wie moechtest du die Anweisungen erhalten?",
    modeDescription: "Waehle zwischen:",
    textButton: "Text",
    videoButton: "Video",
    textTitle: "Textanweisungen",
    continueLabel: "Weiter",
    backLabel: "Zurueck",
    contractTitle: "Kuechenvertragsnummer",
    contractHelper: "Gib deine Kaufvertragsnummer ein.\nDu findest sie auf der Innenseite deines Spuelenschrankes.",
    contractLabel: "Bitte gib deine Vertragsnummer ein:*",
    contractAction: "Bestaetigen",
    contractError: "Die eingegebene Vertragsnummer passt zu keiner aktiven Kueche.",
  },
  en: {
    languageTitle: "Select your language",
    modeTitle: "How would you like instructions?",
    modeDescription: "Choose between:",
    textButton: "Text",
    videoButton: "Video",
    textTitle: "Text instructions",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Kitchen contract number",
    contractHelper: "Enter your purchase contract number.\nYou can find it on the inside of your sink cabinet.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "The entered contract number does not match any active kitchen.",
  },
  tr: {
    languageTitle: "Dilini sec",
    modeTitle: "Talimatlari nasil almak istersiniz?",
    modeDescription: "Secim yap:",
    textButton: "Metin",
    videoButton: "Video",
    textTitle: "Metin talimatlari",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Mutfak sozlesme numarasi",
    contractHelper: "Satin alma sozlesme numarani gir.\nEvye dolabinin ic kisminda bulabilirsin.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "Girilen sozlesme numarasi aktif bir mutfaga ait degil.",
  },
  es: {
    languageTitle: "Elige tu idioma",
    modeTitle: "Como quieres recibir las instrucciones?",
    modeDescription: "Elige entre:",
    textButton: "Texto",
    videoButton: "Video",
    textTitle: "Instrucciones en texto",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Numero de contrato de cocina",
    contractHelper: "Introduce tu numero de contrato de compra.\nLo encuentras en la parte interior del mueble del fregadero.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "El numero introducido no coincide con ninguna cocina activa.",
  },
  fr: {
    languageTitle: "Choisis ta langue",
    modeTitle: "Comment souhaitez-vous recevoir les instructions ?",
    modeDescription: "Choisissez :",
    textButton: "Texte",
    videoButton: "Video",
    textTitle: "Instructions texte",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Numero de contrat de cuisine",
    contractHelper: "Saisissez votre numero de contrat d achat.\nIl se trouve a l interieur du meuble evier.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "Le numero saisi ne correspond a aucune cuisine active.",
  },
  ru: {
    languageTitle: "Vyberi yazyk",
    modeTitle: "Kak vy hotite poluchat instrukcii?",
    modeDescription: "Vyberite variant:",
    textButton: "Tekst",
    videoButton: "Video",
    textTitle: "Tekstovye instrukcii",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Nomer dogovora kuhni",
    contractHelper: "Vvedite nomer dogovora pokupki.\nVy naidete ego na vnutrenney storone shkafa pod moykoy.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "Vvedennyy nomer ne sootvetstvuet aktivnoy kuhne.",
  },
};

const INSTRUCTION_TEXTS = {
  de: [
    "Willkommen bei Fragmento by Architecto!",
    "",
    "Wir helfen dir, deine Kueche in 4 einfachen und praezisen Schritten zu vervollstaendigen, mit 100 % Design- und Passgenauigkeitsgarantie.",
    "",
    "So funktioniert es:",
    "",
    "Schritt 1: Scanne den QR-Code. Du findest ihn auf einem Aufkleber am Kochfeld.",
    "Schritt 2: Gib deine Kaufvertragsnummer ein. Du findest sie auf der Innenseite deines Spuelenschrankes.",
    "Schritt 3: Waehle die Komponenten aus, die du hinzufuegen moechtest.",
    "Schritt 4: Gib deine persoenlichen Daten ein und schliesse deine Bestellung ab.",
    "",
    "Zusaetzlich bieten wir dir:",
    "Professionellen Transport und fachgerechte Montage.",
    "Unterstuetzung bei Foerderantraegen, falls noetig.",
    "",
    "Nach deiner Bestellung ruft dich einer unserer KI-Sprachassistenten an, um alle Details zu bestaetigen.",
    "",
    "Einfach. Schnell. Zuverlaessig.",
    "Lass uns starten!",
  ].join("\n"),
  en: [
    "Welcome to Fragmento by Architecto!",
    "",
    "We help you complete your kitchen in 4 easy and precise steps, with a 100% design and fit guarantee.",
    "",
    "How it works:",
    "",
    "Step 1: Scan the QR code. You can find it on a sticker on the cooktop.",
    "Step 2: Enter your purchase contract number. You will find it on the inside of your sink cabinet.",
    "Step 3: Choose the components you want to add.",
    "Step 4: Enter your personal details and complete your order.",
    "",
    "Additionally, we offer:",
    "Professional transport and installation.",
    "Support with subsidy applications if needed.",
    "",
    "After your order, one of our AI voice agents calls you to confirm all details.",
    "",
    "Simple. Fast. Reliable.",
    "Let us start!",
  ].join("\n"),
  tr: [
    "Fragmento by Architecto'ya hos geldiniz!",
    "",
    "Mutfaginizi 4 kolay ve net adimda tamamlamaniza yardimci oluyoruz.",
    "",
    "Nasil calisir:",
    "",
    "Adim 1: QR kodunu tara. Etiketi ocak ustunde bulabilirsin.",
    "Adim 2: Satin alma sozlesme numarani gir. Evyenin alt dolabinin ic kismina bak.",
    "Adim 3: Eklemek istedigin bilesenleri sec.",
    "Adim 4: Kisisel bilgilerini gir ve siparisini tamamla.",
    "",
    "Ek olarak sunduklarimiz:",
    "Profesyonel tasima ve montaj.",
    "Gerekirse tesvik basvurularinda destek.",
    "",
    "Siparisinden sonra yapay zeka sesli asistanimiz tum detaylari teyit etmek icin seni arar.",
  ].join("\n"),
  es: [
    "Bienvenido a Fragmento by Architecto!",
    "",
    "Te ayudamos a completar tu cocina en 4 pasos faciles y precisos.",
    "",
    "Como funciona:",
    "",
    "Paso 1: Escanea el codigo QR.",
    "Paso 2: Introduce tu numero de contrato de compra.",
    "Paso 3: Elige los componentes que quieres anadir.",
    "Paso 4: Introduce tus datos personales y completa el pedido.",
  ].join("\n"),
  fr: [
    "Bienvenue chez Fragmento by Architecto !",
    "",
    "Nous vous aidons a completer votre cuisine en 4 etapes simples et precises.",
    "",
    "Comment ca marche :",
    "",
    "Etape 1 : Scannez le code QR.",
    "Etape 2 : Saisissez votre numero de contrat d achat.",
    "Etape 3 : Choisissez les composants a ajouter.",
    "Etape 4 : Saisissez vos informations personnelles et finalisez la commande.",
  ].join("\n"),
  ru: [
    "Dobro pozhalovat v Fragmento by Architecto!",
    "",
    "My pomogaem zavershit vashu kuhnyu za 4 prostykh shaga.",
    "",
    "Kak eto rabotaet:",
    "",
    "Shag 1: Otskaniruyte QR-kod.",
    "Shag 2: Vvedite nomer dogovora pokupki.",
    "Shag 3: Vyberite komponenty dlya dobavleniya.",
    "Shag 4: Vvedite lichnye dannye i zavershite zakaz.",
  ].join("\n"),
};

const AVATAR_SOURCES = {
  de: "/AVATAR/de-avatar.mp4",
  en: "/AVATAR/en-avatar.mp4",
  tr: "/AVATAR/tr-avatar.mp4",
  es: "/AVATAR/es-avatar.mp4",
  fr: "/AVATAR/fr-avatar.mp4",
  ru: "/AVATAR/ru-avatar.mp4",
};

function ActionRow({ backLabel, onBack, actionLabel, onAction, submit = false, disabled = false }) {
  return (
    <div style={footerRowStyle}>
      <button type="button" style={secondaryButtonStyle} onClick={onBack} disabled={disabled}>
        {backLabel}
      </button>
      <button type={submit ? "submit" : "button"} style={primaryButtonStyle} onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  );
}

export default function FragmentoEntryFlow() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState("de");
  const [selectedMode, setSelectedMode] = useState("");
  const [screen, setScreen] = useState("language");
  const [contractNumber, setContractNumber] = useState("");
  const [error, setError] = useState("");
  const [isValidatingContract, setIsValidatingContract] = useState(false);

  const text = SCREEN_TEXT[selectedLanguage] || SCREEN_TEXT.en;
  const instructionText = INSTRUCTION_TEXTS[selectedLanguage] || INSTRUCTION_TEXTS.en;
  const avatarSource = AVATAR_SOURCES[selectedLanguage] || AVATAR_SOURCES.en;

  function handleLanguageSelect(language) {
    setSelectedLanguage(language);
    setSelectedMode("");
    setError("");
    setScreen("mode");
  }

  function handleModeSelect(mode) {
    setSelectedMode(mode);
    setError("");
    setScreen(mode);
  }

  async function handleContractSubmit(event) {
    event.preventDefault();
    const normalizedContractNumber = contractNumber.trim();
    if (!normalizedContractNumber) {
      setError("Contract number is required.");
      return;
    }

    setIsValidatingContract(true);
    setError("");

    try {
      const response = await fetch("/api/kitchen-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractNumber: normalizedContractNumber }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.contractError);
      }

      const params = new URLSearchParams({
        contractNumber: payload.contractNumber || normalizedContractNumber,
        lang: selectedLanguage,
        instructionMode: selectedMode || "text",
      });

      router.push(`/kitchens/${payload.kitchenSlug}?${params.toString()}`);
    } catch (error) {
      setError(error.message || text.contractError);
    } finally {
      setIsValidatingContract(false);
    }
  }

  return (
    <main style={pageStyle}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{responsivePanelMedia}</style>
      <div style={centerWrapStyle}>
        <section style={panelStyle}>
          <Link href="/admin" style={adminLinkStyle}>
            Admin
          </Link>

          <div style={logoWrapStyle}>
            <img src="/img/fragmentologo.png" alt="Fragmento by architecto." style={logoStyle} />
          </div>

          {screen === "language" ? (
            <div style={contentAreaStyle}>
              <h2 style={headlineStyle}>{text.languageTitle}</h2>
              <div className="fragmento-entry-panel-grid" style={languageGridStyle}>
                {LANGUAGE_OPTIONS.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    style={optionButtonStyle}
                    onClick={() => handleLanguageSelect(language.code)}
                  >
                    <img src={language.flagSrc} alt="" aria-hidden="true" style={flagStyle} />
                    <span>{language.label}</span>
                  </button>
                ))}
              </div>
              <div style={languageFooterStyle}>
                <img src="/img/FIGURA.png" alt="" aria-hidden="true" style={languageFigureStyle} />
              </div>
            </div>
          ) : null}

          {screen === "mode" ? (
            <div style={contentAreaStyle}>
              <h2 style={headlineStyle}>{text.modeTitle}</h2>
              <p style={subheadlineStyle}>{text.modeDescription}</p>
              <div style={modeGridStyle}>
                <button type="button" style={modeButtonStyle} onClick={() => handleModeSelect("text")}>
                  {text.textButton}
                </button>
                <button type="button" style={modeButtonStyle} onClick={() => handleModeSelect("video")}>
                  {text.videoButton}
                </button>
              </div>
              <div style={modeBackRowStyle}>
                <button type="button" style={secondaryButtonStyle} onClick={() => setScreen("language")}>
                  {text.backLabel}
                </button>
              </div>
            </div>
          ) : null}

          {screen === "text" ? (
            <div style={contentAreaStyle}>
              <div style={textCardCompactStyle}>
                {instructionText.split("\n").map((line, index) => (
                  <p key={`${selectedLanguage}-${index}`} style={textLineStyle}>
                    {line || "\u00a0"}
                  </p>
                ))}
              </div>
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen("mode")}
                actionLabel={text.continueLabel}
                onAction={() => setScreen("contract")}
              />
            </div>
          ) : null}

          {screen === "video" ? (
            <div style={contentAreaStyle}>
              <div style={videoFrameStyle}>
                <video key={avatarSource} controls style={videoStyle}>
                  <source src={avatarSource} type="video/mp4" />
                </video>
              </div>
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen("mode")}
                actionLabel={text.continueLabel}
                onAction={() => setScreen("contract")}
              />
            </div>
          ) : null}

          {screen === "contract" ? (
            <form style={contentAreaStyle} onSubmit={handleContractSubmit}>
              <h2 style={headlineStyle}>{text.contractTitle}</h2>
              <div style={contractInfoCardStyle}>
                <div style={contractImageWrapStyle}>
                  <img src="/img/sink23.png" alt="Sink cabinet contract number location" style={contractImageStyle} />
                </div>
                <div style={contractHelperWrapStyle}>
                  {text.contractHelper.split("\n").map((line, index) => (
                    <p key={`helper-${index}`} style={contractHelperStyle}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <label htmlFor="entry-contract-number" style={contractLabelStyle}>
                {text.contractLabel}
              </label>
              <input
                id="entry-contract-number"
                value={contractNumber}
                onChange={(event) => {
                  setContractNumber(event.target.value);
                  if (error) setError("");
                }}
                disabled={isValidatingContract}
                placeholder="z.B. 123456789"
                style={contractInputStyle}
              />
              {error ? <p style={errorStyle}>{error}</p> : null}
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen(selectedMode || "mode")}
                actionLabel={isValidatingContract ? "Checking..." : text.contractAction}
                submit
                disabled={isValidatingContract}
              />
            </form>
          ) : null}
          {screen === "mode" || screen === "video" ? (
            <img src="/img/FIGURA.png" alt="" aria-hidden="true" style={figureStyle} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f8f7f4",
  fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const centerWrapStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "28px",
};

const panelStyle = {
  width: "min(92vw, 720px)",
  minHeight: 480,
  position: "relative",
  background: "linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(252, 246, 238, 0.95) 100%)",
  border: "1px solid rgba(177, 145, 116, 0.22)",
  borderRadius: 18,
  boxShadow: "0 24px 56px rgba(36, 24, 12, 0.22)",
  padding: "10px 16px 16px",
  overflow: "hidden",
};

const adminLinkStyle = {
  position: "absolute",
  top: 18,
  right: 22,
  fontSize: 12,
  color: "#8e6e42",
  textDecoration: "none",
};

const logoWrapStyle = {
  display: "grid",
  placeItems: "center",
  marginTop: -14,
  marginBottom: -20,
};

const logoStyle = {
  width: "min(360px, 72%)",
  height: "auto",
  maxWidth: "100%",
  display: "block",
};

const contentAreaStyle = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
};

const headlineStyle = {
  margin: "-18px 0 8px",
  textAlign: "center",
  fontSize: "clamp(18px, 2.2vw, 24px)",
  fontWeight: 800,
  color: "#372f29",
  letterSpacing: "0.2px",
  position: "relative",
  top: -50,
};

const subheadlineStyle = {
  margin: "14px 0 0",
  textAlign: "center",
  fontSize: 18,
  color: "#302924",
};

const languageGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
  gap: 12,
  marginTop: 2,
  position: "relative",
  top: -40,
};

const optionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "flex-start",
  padding: "11px 14px",
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(110, 84, 61, 0.2)",
  background: "linear-gradient(180deg, #fffdf8 0%, #f7ecdf 100%)",
  color: "#372f29",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
};

const flagStyle = {
  width: 24,
  height: 18,
  objectFit: "cover",
  borderRadius: 3,
  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.12)",
  flexShrink: 0,
};

const modeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 210px))",
  justifyContent: "center",
  gap: 16,
  marginTop: 34,
};

const modeButtonStyle = {
  padding: "16px 24px",
  borderRadius: 14,
  border: "1px solid #dbc9b1",
  background: "linear-gradient(180deg, #f9f3ea 0%, #f3eadf 100%)",
  color: "#372f29",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const modeBackRowStyle = {
  marginTop: 166,
};

const textCardStyle = {
  minHeight: 340,
  background: "rgba(255, 255, 255, 0.48)",
  padding: "12px 8px 12px 8px",
  color: "#38322b",
};

const textCardCompactStyle = {
  ...textCardStyle,
  minHeight: 0,
  maxWidth: 720,
  margin: "0 auto",
  padding: "10px 6px 4px",
};

const textLineStyle = {
  margin: "0 0 10px",
  fontSize: 16,
  lineHeight: 1.22,
};

const videoFrameStyle = {
  width: "100%",
  minHeight: 340,
  borderRadius: 12,
  overflow: "hidden",
  background: "#16120f",
};

const videoStyle = {
  width: "100%",
  display: "block",
  maxHeight: 360,
};

const contractInfoCardStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  alignItems: "center",
  gap: 18,
  marginTop: 22,
  marginBottom: 18,
  background: "rgba(255, 255, 255, 0.45)",
};

const contractImageWrapStyle = {
  display: "grid",
  placeItems: "center",
};

const contractImageStyle = {
  width: 190,
  height: "auto",
  display: "block",
};

const contractHelperWrapStyle = {
  textAlign: "center",
  paddingRight: 8,
};

const contractHelperStyle = {
  margin: "0 0 6px",
  fontSize: 18,
  lineHeight: 1.3,
  color: "#3b332d",
  fontWeight: 700,
};

const contractLabelStyle = {
  display: "block",
  color: "#6a625a",
  fontSize: 15,
  marginBottom: 10,
};

const contractInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 4,
  border: "1px solid #c9c8c6",
  background: "#ffffff",
  padding: "14px 12px",
  fontSize: 16,
  color: "#2f2924",
};

const footerRowStyle = {
  marginTop: 42,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const secondaryButtonStyle = {
  border: "1px solid #dbc9b1",
  borderRadius: 12,
  background: "linear-gradient(180deg, #fbf5ed 0%, #f1e7db 100%)",
  color: "#372f29",
  padding: "10px 14px",
  fontSize: 16,
  cursor: "pointer",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 12,
  background: "#b4712d",
  color: "#fffdf8",
  padding: "12px 20px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
};

const figureStyle = {
  position: "absolute",
  right: 20,
  bottom: 18,
  width: 66,
  height: "auto",
  pointerEvents: "none",
};

const languageFooterStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  marginTop: "auto",
  gap: 8,
  width: "100%",
  position: "relative",
  top: -20,
};

const languageFigureStyle = {
  width: 112,
  maxWidth: 112,
  maxHeight: 112,
  height: "auto",
  objectFit: "contain",
  pointerEvents: "none",
};

const responsivePanelMedia = `
  @media (max-width: 720px) {
    .fragmento-entry-panel-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 520px) {
    .fragmento-entry-panel-grid {
      grid-template-columns: 1fr !important;
    }

    .fragmento-entry-language-footer {
      top: 0 !important;
    }
  }
`;

const errorStyle = {
  margin: "8px 0 0",
  color: "#b0382d",
  fontSize: 14,
  fontWeight: 700,
};
