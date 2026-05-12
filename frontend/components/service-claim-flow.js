"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "Deutsch", flagSrc: "https://flagcdn.com/w40/de.png" },
  { code: "en", label: "English", flagSrc: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "T\u00fcrk\u00e7e", flagSrc: "https://flagcdn.com/w40/tr.png" },
  { code: "es", label: "Espa\u00f1ol", flagSrc: "https://flagcdn.com/w40/es.png" },
  { code: "fr", label: "Fran\u00e7ais", flagSrc: "https://flagcdn.com/w40/fr.png" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flagSrc: "https://flagcdn.com/w40/ru.png" },
];

const MAX_CLAIM_ATTACHMENT_COUNT = 5;
const MAX_CLAIM_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const CLAIM_ATTACHMENT_ACCEPT = "image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx";

const CLAIM_FILENAME_PATTERN = /\.(pdf|png|jpe?g|gif|webp|bmp|tiff?|txt|docx?|xlsx?)$/i;

function isClientAllowedAttachment(file) {
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/svg+xml") {
    return false;
  }
  if (mime.startsWith("image/")) {
    return true;
  }
  return CLAIM_FILENAME_PATTERN.test(file.name);
}

const COPY = {
  de: {
    eyebrow: "Fragmento Service",
    title: "Willkommen beim Fragmento Service",
    intro:
      "Wähle den passenden Weg für dein Anliegen. Du kannst mit einer Bestellung oder einem Zusatzkauf weitermachen oder direkt eine Reklamation an unser Support-Team senden.",
    purchaseBadge: "Nachkauf",
    purchaseTitle: "Zusatzkauf",
    purchaseText: "\u00d6ffne den K\u00fcchenkonfigurator und fahre mit zus\u00e4tzlichen Komponenten oder Zubeh\u00f6r fort.",
    complaintBadge: "Reklamation",
    complaintTitle: "Reklamation",
    complaintText: "Nutze das Reklamationsformular und melde ein Problem mit Ger\u00e4t oder K\u00fcche.",
    purchasePanelTitle: "Weiter zum Kaufprozess",
    purchasePanelText: "Wenn der Mieter zus\u00e4tzliche Artikel statt einer Reklamation ben\u00f6tigt, geht es hier zum Konfigurator.",
    openConfigurator: "Konfigurator \u00f6ffnen",
    back: "Zur\u00fcck",
    formTitle: "KD Formular",
    formIntro: "F\u00fclle unten die wichtigsten Reklamationsdaten aus.",
    contractNumber: "Kaufvertragsnummer",
    contractPlaceholder: "z.B. 736267",
    givenName: "Vorname",
    givenNamePlaceholder: "Vorname",
    surname: "Nachname",
    surnamePlaceholder: "Nachname",
    gender: "Geschlecht",
    genderPlaceholder: "Bitte w\u00e4hlen",
    genderFemale: "Weiblich",
    genderMale: "M\u00e4nnlich",
    genderPreferNot: "Keine Angabe",
    phone: "Telefonnummer",
    phonePlaceholder: "+49 ...",
    email: "E-Mail-Adresse",
    emailPlaceholder: "name@beispiel.de",
    clientAddress: "Adresse des Kunden",
    clientCountry: "Land",
    clientCountryPlaceholder: "Deutschland",
    clientAddressLine1: "Adresszeile 1",
    clientAddressLine1Placeholder: "Stra\u00dfe und Hausnummer",
    clientAddressLine2: "Adresszeile 2",
    clientAddressLine2Placeholder: "Zusatz, Aufgang, etc.",
    clientPostalCode: "PLZ",
    clientPostalCodePlaceholder: "z.B. 10115",
    clientCity: "Ort",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Stockwerk",
    clientFloorPlaceholder: "z.B. 3",
    clientUnitNumber: "Wohnungsnummer",
    clientUnitNumberPlaceholder: "z.B. 3B",
    landlordSection: "Vermieter",
    landlordGivenName: "Vorname",
    landlordGivenNamePlaceholder: "Vorname",
    landlordSurname: "Nachname",
    landlordSurnamePlaceholder: "Nachname",
    landlordPhone: "Telefon Vermieter",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-Mail Vermieter",
    landlordEmailPlaceholder: "vermieter@beispiel.de",
    hausmeisterSection: "Hausmeister",
    hausmeisterGivenName: "Vorname",
    hausmeisterGivenNamePlaceholder: "Vorname",
    hausmeisterSurname: "Nachname",
    hausmeisterSurnamePlaceholder: "Nachname",
    hausmeisterPhone: "Telefon Hausmeister",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-Mail Hausmeister",
    hausmeisterEmailPlaceholder: "hausmeister@beispiel.de",
    problemDescription: "Problembeschreibung in Stichworten",
    problemPlaceholder: "Beschreibe das Problem kurz",
    serialNumber: "Seriennummer des E-Ger\u00e4tes",
    serialPlaceholder: "Seriennummer",
    attachments: "Anh\u00e4nge (optional)",
    attachmentsHint: "PDF, Bilder oder Office-Dateien \u2014 bis zu 5 Dateien, je max. 4 MB.",
    attachmentsClear: "Alle entfernen",
    attachmentsSelected: "{count} Datei(en) ausgew\u00e4hlt",
    attachmentsErrorTooMany: "Maximal 5 Anh\u00e4nge m\u00f6glich.",
    attachmentsErrorFileTooLarge: "Jede Datei darf h\u00f6chstens 4 MB gro\u00df sein.",
    attachmentsErrorType: "Dateityp nicht erlaubt (z. B. PDF, Bilder, Word/Excel).",
    contactHint: "Mindestens eine Kontaktm\u00f6glichkeit ist erforderlich: Telefonnummer oder E-Mail-Adresse.",
    submit: "Reklamation senden",
    submitting: "Wird gesendet...",
    contactError: "Bitte gib mindestens eine Telefonnummer oder E-Mail-Adresse an.",
    contractLookupLoading: "Vertragsnummer wird gepr\u00fcft...",
    contractLookupSuccess: "Adresse aus den hinterlegten Vertragsdaten eingef\u00fcllt. Du kannst die Felder weiter bearbeiten.",
    contractLookupError: "Die Vertragsnummer wurde nicht gefunden.",
    submitError: "Deine Reklamation konnte nicht gesendet werden.",
    submitSuccess: "Deine Reklamation wurde erfolgreich \u00fcbermittelt.",
  },
  en: {
    eyebrow: "Fragmento Service",
    title: "Welcome to Fragmento Service",
    intro:
      "Choose the path that fits your request. You can continue with an order or additional purchase, or send a claim directly to our support team.",
    purchaseBadge: "Additional purchase",
    purchaseTitle: "Additional purchase",
    purchaseText: "Open the kitchen configurator and continue with extra components or accessories.",
    complaintBadge: "Complaint",
    complaintTitle: "Complaint request",
    complaintText: "Report a device or kitchen issue and send the details to support.",
    purchasePanelTitle: "Continue to the purchase flow",
    purchasePanelText: "If the tenant needs additional items instead of a complaint, continue to the configurator.",
    openConfigurator: "Open configurator",
    back: "Back",
    formTitle: "KD Form",
    formIntro: "Fill in the main complaint details below.",
    contractNumber: "Purchase contract number",
    contractPlaceholder: "e.g. 736267",
    givenName: "Name",
    givenNamePlaceholder: "Name",
    surname: "Surname",
    surnamePlaceholder: "Surname",
    gender: "Gender",
    genderPlaceholder: "Select\u2026",
    genderFemale: "Female",
    genderMale: "Male",
    genderPreferNot: "Prefer not to say",
    phone: "Phone number",
    phonePlaceholder: "+49 ...",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    clientAddress: "Client address",
    clientCountry: "Country",
    clientCountryPlaceholder: "Germany",
    clientAddressLine1: "Address line 1",
    clientAddressLine1Placeholder: "Street and house number",
    clientAddressLine2: "Address line 2",
    clientAddressLine2Placeholder: "Apartment, entrance, etc.",
    clientPostalCode: "Postal code",
    clientPostalCodePlaceholder: "e.g. 10115",
    clientCity: "City",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Floor",
    clientFloorPlaceholder: "e.g. 3",
    clientUnitNumber: "Unit number",
    clientUnitNumberPlaceholder: "e.g. 3B",
    landlordSection: "Landlord",
    landlordGivenName: "Name",
    landlordGivenNamePlaceholder: "Name",
    landlordSurname: "Surname",
    landlordSurnamePlaceholder: "Surname",
    landlordPhone: "Landlord phone",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Landlord email",
    landlordEmailPlaceholder: "landlord@example.com",
    hausmeisterSection: "Property manager",
    hausmeisterGivenName: "Name",
    hausmeisterGivenNamePlaceholder: "Name",
    hausmeisterSurname: "Surname",
    hausmeisterSurnamePlaceholder: "Surname",
    hausmeisterPhone: "Property manager phone",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Property manager email",
    hausmeisterEmailPlaceholder: "manager@example.com",
    problemDescription: "Problem description",
    problemPlaceholder: "Describe the issue briefly",
    serialNumber: "Serial number of the appliance",
    serialPlaceholder: "Serial number",
    attachments: "Attachments (optional)",
    attachmentsHint: "PDFs, images, or office files \u2014 up to 5 files, 4 MB each.",
    attachmentsClear: "Remove all",
    attachmentsSelected: "{count} file(s) selected",
    attachmentsErrorTooMany: "You can attach at most 5 files.",
    attachmentsErrorFileTooLarge: "Each file must be 4 MB or smaller.",
    attachmentsErrorType: "This file type is not allowed. Use PDF, images, or common office formats.",
    contactHint: "At least one contact method is required: phone number or email address.",
    contractLookupLoading: "Checking contract number...",
    contractLookupSuccess: "Address autofilled from the saved contract data. You can still edit the fields.",
    contractLookupError: "Contract number was not found.",
    submit: "Send complaint",
    submitting: "Submitting...",
    contactError: "Please provide at least a phone number or an email address.",
    submitError: "Your complaint could not be submitted.",
    submitSuccess: "Your complaint has been submitted successfully.",
  },
  tr: {
    eyebrow: "Fragmento Servis",
    title: "Fragmento Servis'e Ho\u015f Geldiniz",
    intro:
      "Talebinize uygun yolu se\u00e7in. Sipari\u015f veya ek sat\u0131n alma ile devam edebilir ya da do\u011frudan destek ekibine \u015fikayet g\u00f6nderebilirsiniz.",
    purchaseBadge: "Ek sat\u0131n alma",
    purchaseTitle: "Ek sat\u0131n alma",
    purchaseText: "Mutfak yap\u0131land\u0131r\u0131c\u0131s\u0131n\u0131 a\u00e7\u0131n ve ek bile\u015fenler veya aksesuarlarla devam edin.",
    complaintBadge: "\u015eikayet",
    complaintTitle: "\u015eikayet talebi",
    complaintText: "Cihaz veya mutfak sorununu bildirip ayr\u0131nt\u0131lar\u0131 deste\u011fe g\u00f6nderin.",
    purchasePanelTitle: "Sat\u0131n alma ak\u0131\u015f\u0131na devam et",
    purchasePanelText: "Kirac\u0131n\u0131n \u015fikayet yerine ek \u00fcr\u00fcnlere ihtiyac\u0131 varsa, yap\u0131land\u0131r\u0131c\u0131ya devam edin.",
    openConfigurator: "Yap\u0131land\u0131r\u0131c\u0131y\u0131 a\u00e7",
    back: "Geri",
    formTitle: "Servis Formu",
    formIntro: "Ana \u015fikayet bilgilerini a\u015fa\u011f\u0131ya girin.",
    contractNumber: "Sat\u0131n alma s\u00f6zle\u015fme numaras\u0131",
    contractPlaceholder: "\u00f6rn. 736267",
    givenName: "Ad",
    givenNamePlaceholder: "Ad",
    surname: "Soyad",
    surnamePlaceholder: "Soyad",
    gender: "Cinsiyet",
    genderPlaceholder: "Se\u00e7in",
    genderFemale: "Kad\u0131n",
    genderMale: "Erkek",
    genderPreferNot: "Belirtmek istemiyorum",
    phone: "Telefon numaras\u0131",
    phonePlaceholder: "+49 ...",
    email: "E-posta adresi",
    emailPlaceholder: "isim@example.com",
    clientAddress: "M\u00fc\u015fteri adresi",
    clientCountry: "\u00dclke",
    clientCountryPlaceholder: "Almanya",
    clientAddressLine1: "Adres sat\u0131r\u0131 1",
    clientAddressLine1Placeholder: "Sokak ve bina no",
    clientAddressLine2: "Adres sat\u0131r\u0131 2",
    clientAddressLine2Placeholder: "Daire, giri\u015f, vb.",
    clientPostalCode: "Posta kodu",
    clientPostalCodePlaceholder: "\u00f6rn. 10115",
    clientCity: "\u015eehir",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Kat",
    clientFloorPlaceholder: "\u00f6rn. 3",
    clientUnitNumber: "Daire no",
    clientUnitNumberPlaceholder: "\u00f6rn. 3B",
    landlordSection: "Ev sahibi",
    landlordGivenName: "Ad",
    landlordGivenNamePlaceholder: "Ad",
    landlordSurname: "Soyad",
    landlordSurnamePlaceholder: "Soyad",
    landlordPhone: "Ev sahibi telefonu",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Ev sahibi e-postas\u0131",
    landlordEmailPlaceholder: "evsahibi@example.com",
    hausmeisterSection: "Bina g\u00f6revlisi",
    hausmeisterGivenName: "Ad",
    hausmeisterGivenNamePlaceholder: "Ad",
    hausmeisterSurname: "Soyad",
    hausmeisterSurnamePlaceholder: "Soyad",
    hausmeisterPhone: "Bina g\u00f6revlisi telefonu",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Bina g\u00f6revlisi e-postas\u0131",
    hausmeisterEmailPlaceholder: "gorevli@example.com",
    problemDescription: "Sorun a\u00e7\u0131klamas\u0131",
    problemPlaceholder: "Sorunu k\u0131saca a\u00e7\u0131klay\u0131n",
    serialNumber: "Cihaz seri numaras\u0131",
    serialPlaceholder: "Seri numaras\u0131",
    attachments: "Ekler (iste\u011fe ba\u011fl\u0131)",
    attachmentsHint: "PDF, g\u00f6rsel veya ofis dosyalar\u0131 \u2014 en fazla 5 dosya, dosya ba\u015f\u0131na en fazla 4 MB.",
    attachmentsClear: "T\u00fcm\u00fcn\u00fc kald\u0131r",
    attachmentsSelected: "{count} dosya se\u00e7ildi",
    attachmentsErrorTooMany: "En fazla 5 dosya ekleyebilirsiniz.",
    attachmentsErrorFileTooLarge: "Her dosya en fazla 4 MB olabilir.",
    attachmentsErrorType: "Bu dosya t\u00fcr\u00fcne izin verilmiyor (PDF, g\u00f6rsel, Word/Excel vb.).",
    contactHint: "En az bir ileti\u015fim bilgisi gerekli: telefon numaras\u0131 veya e-posta adresi.",
    submit: "\u015eikayeti g\u00f6nder",
    submitting: "G\u00f6nderiliyor...",
    contactError: "L\u00fctfen en az bir telefon numaras\u0131 veya e-posta adresi girin.",
    submitError: "\u015eikayetiniz g\u00f6nderilemedi.",
    submitSuccess: "\u015eikayetiniz ba\u015far\u0131yla g\u00f6nderildi.",
  },
  es: {
    eyebrow: "Servicio Fragmento",
    title: "Bienvenido al servicio de Fragmento",
    intro:
      "Elige la opci\u00f3n adecuada para tu solicitud. Puedes continuar con un pedido o una compra adicional, o enviar una reclamaci\u00f3n al equipo de soporte.",
    purchaseBadge: "Compra adicional",
    purchaseTitle: "Compra adicional",
    purchaseText: "Abre el configurador de cocina y contin\u00faa con componentes o accesorios adicionales.",
    complaintBadge: "Reclamaci\u00f3n",
    complaintTitle: "Solicitud de reclamaci\u00f3n",
    complaintText: "Informa de un problema con el dispositivo o la cocina y env\u00edalo a soporte.",
    purchasePanelTitle: "Continuar al proceso de compra",
    purchasePanelText: "Si el inquilino necesita art\u00edculos adicionales en lugar de una reclamaci\u00f3n, contin\u00faa al configurador.",
    openConfigurator: "Abrir configurador",
    back: "Atr\u00e1s",
    formTitle: "Formulario de servicio",
    formIntro: "Complete a continuaci\u00f3n los datos principales de la reclamaci\u00f3n.",
    contractNumber: "N\u00famero de contrato de compra",
    contractPlaceholder: "p. ej. 736267",
    givenName: "Nombre",
    givenNamePlaceholder: "Nombre",
    surname: "Apellidos",
    surnamePlaceholder: "Apellidos",
    gender: "Sexo",
    genderPlaceholder: "Seleccione",
    genderFemale: "Mujer",
    genderMale: "Hombre",
    genderPreferNot: "Prefiero no decirlo",
    phone: "N\u00famero de tel\u00e9fono",
    phonePlaceholder: "+49 ...",
    email: "Direcci\u00f3n de correo electr\u00f3nico",
    emailPlaceholder: "nombre@ejemplo.com",
    clientAddress: "Direcci\u00f3n del cliente",
    clientCountry: "Pa\u00eds",
    clientCountryPlaceholder: "Alemania",
    clientAddressLine1: "Direcci\u00f3n l\u00ednea 1",
    clientAddressLine1Placeholder: "Calle y n\u00famero",
    clientAddressLine2: "Direcci\u00f3n l\u00ednea 2",
    clientAddressLine2Placeholder: "Apartamento, entrada, etc.",
    clientPostalCode: "C\u00f3digo postal",
    clientPostalCodePlaceholder: "p. ej. 10115",
    clientCity: "Ciudad",
    clientCityPlaceholder: "Berl\u00edn",
    clientFloor: "Piso",
    clientFloorPlaceholder: "p. ej. 3",
    clientUnitNumber: "N\u00famero de unidad",
    clientUnitNumberPlaceholder: "p. ej. 3B",
    landlordSection: "Propietario",
    landlordGivenName: "Nombre",
    landlordGivenNamePlaceholder: "Nombre",
    landlordSurname: "Apellidos",
    landlordSurnamePlaceholder: "Apellidos",
    landlordPhone: "Tel\u00e9fono del propietario",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Correo del propietario",
    landlordEmailPlaceholder: "propietario@ejemplo.com",
    hausmeisterSection: "Encargado",
    hausmeisterGivenName: "Nombre",
    hausmeisterGivenNamePlaceholder: "Nombre",
    hausmeisterSurname: "Apellidos",
    hausmeisterSurnamePlaceholder: "Apellidos",
    hausmeisterPhone: "Tel\u00e9fono del encargado",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Correo del encargado",
    hausmeisterEmailPlaceholder: "encargado@ejemplo.com",
    problemDescription: "Descripci\u00f3n del problema",
    problemPlaceholder: "Describa brevemente el problema",
    serialNumber: "N\u00famero de serie del electrodom\u00e9stico",
    serialPlaceholder: "N\u00famero de serie",
    attachments: "Adjuntos (opcional)",
    attachmentsHint: "PDF, im\u00e1genes u oficina: hasta 5 archivos, 4 MB cada uno.",
    attachmentsClear: "Quitar todos",
    attachmentsSelected: "{count} archivo(s) seleccionado(s)",
    attachmentsErrorTooMany: "Puede adjuntar como m\u00e1ximo 5 archivos.",
    attachmentsErrorFileTooLarge: "Cada archivo debe tener 4 MB o menos.",
    attachmentsErrorType: "Tipo de archivo no permitido (p. ej. PDF, im\u00e1genes, Word/Excel).",
    contactHint: "Se requiere al menos un m\u00e9todo de contacto: tel\u00e9fono o correo electr\u00f3nico.",
    submit: "Enviar reclamaci\u00f3n",
    submitting: "Enviando...",
    contactError: "Indique al menos un n\u00famero de tel\u00e9fono o una direcci\u00f3n de correo electr\u00f3nico.",
    submitError: "No se pudo enviar la reclamaci\u00f3n.",
    submitSuccess: "La reclamaci\u00f3n se ha enviado correctamente.",
  },
  fr: {
    eyebrow: "Service Fragmento",
    title: "Bienvenue sur le service Fragmento",
    intro:
      "Choisissez le parcours adapt\u00e9 \u00e0 votre demande. Vous pouvez poursuivre une commande ou un achat compl\u00e9mentaire, ou envoyer une r\u00e9clamation \u00e0 notre \u00e9quipe de support.",
    purchaseBadge: "Achat compl\u00e9mentaire",
    purchaseTitle: "Achat compl\u00e9mentaire",
    purchaseText: "Ouvrez le configurateur de cuisine et continuez avec des composants ou accessoires suppl\u00e9mentaires.",
    complaintBadge: "R\u00e9clamation",
    complaintTitle: "Demande de r\u00e9clamation",
    complaintText: "Signalez un probl\u00e8me avec l'appareil ou la cuisine et envoyez-le au support.",
    purchasePanelTitle: "Continuer vers le processus d'achat",
    purchasePanelText: "Si le locataire a besoin d'articles suppl\u00e9mentaires plut\u00f4t que d'une r\u00e9clamation, continuez vers le configurateur.",
    openConfigurator: "Ouvrir le configurateur",
    back: "Retour",
    formTitle: "Formulaire SAV",
    formIntro: "Renseignez ci-dessous les principales informations de r\u00e9clamation.",
    contractNumber: "Num\u00e9ro de contrat d'achat",
    contractPlaceholder: "ex. 736267",
    givenName: "Pr\u00e9nom",
    givenNamePlaceholder: "Pr\u00e9nom",
    surname: "Nom",
    surnamePlaceholder: "Nom",
    gender: "Genre",
    genderPlaceholder: "S\u00e9lectionnez",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderPreferNot: "Je pr\u00e9f\u00e8re ne pas r\u00e9pondre",
    phone: "Num\u00e9ro de t\u00e9l\u00e9phone",
    phonePlaceholder: "+49 ...",
    email: "Adresse e-mail",
    emailPlaceholder: "nom@exemple.com",
    clientAddress: "Adresse du client",
    clientCountry: "Pays",
    clientCountryPlaceholder: "Allemagne",
    clientAddressLine1: "Adresse ligne 1",
    clientAddressLine1Placeholder: "Rue et num\u00e9ro",
    clientAddressLine2: "Adresse ligne 2",
    clientAddressLine2Placeholder: "Appartement, entr\u00e9e, etc.",
    clientPostalCode: "Code postal",
    clientPostalCodePlaceholder: "ex. 10115",
    clientCity: "Ville",
    clientCityPlaceholder: "Berlin",
    clientFloor: "\u00c9tage",
    clientFloorPlaceholder: "ex. 3",
    clientUnitNumber: "Num\u00e9ro d'unit\u00e9",
    clientUnitNumberPlaceholder: "ex. 3B",
    landlordSection: "Propri\u00e9taire",
    landlordGivenName: "Pr\u00e9nom",
    landlordGivenNamePlaceholder: "Pr\u00e9nom",
    landlordSurname: "Nom",
    landlordSurnamePlaceholder: "Nom",
    landlordPhone: "T\u00e9l\u00e9phone du propri\u00e9taire",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail du propri\u00e9taire",
    landlordEmailPlaceholder: "proprietaire@exemple.com",
    hausmeisterSection: "Gardien",
    hausmeisterGivenName: "Pr\u00e9nom",
    hausmeisterGivenNamePlaceholder: "Pr\u00e9nom",
    hausmeisterSurname: "Nom",
    hausmeisterSurnamePlaceholder: "Nom",
    hausmeisterPhone: "T\u00e9l\u00e9phone du gardien",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail du gardien",
    hausmeisterEmailPlaceholder: "gardien@exemple.com",
    problemDescription: "Description du probl\u00e8me",
    problemPlaceholder: "D\u00e9crivez bri\u00e8vement le probl\u00e8me",
    serialNumber: "Num\u00e9ro de s\u00e9rie de l'appareil",
    serialPlaceholder: "Num\u00e9ro de s\u00e9rie",
    attachments: "Pi\u00e8ces jointes (facultatif)",
    attachmentsHint: "PDF, images ou bureautique : jusqu'\u00e0 5 fichiers, 4 Mo chacun.",
    attachmentsClear: "Tout retirer",
    attachmentsSelected: "{count} fichier(s) s\u00e9lectionn\u00e9(s)",
    attachmentsErrorTooMany: "Vous pouvez joindre au maximum 5 fichiers.",
    attachmentsErrorFileTooLarge: "Chaque fichier doit faire 4 Mo ou moins.",
    attachmentsErrorType: "Type de fichier non autoris\u00e9 (PDF, images, Word/Excel, etc.).",
    contactHint: "Au moins un moyen de contact est requis : t\u00e9l\u00e9phone ou e-mail.",
    submit: "Envoyer la r\u00e9clamation",
    submitting: "Envoi en cours...",
    contactError: "Veuillez fournir au moins un num\u00e9ro de t\u00e9l\u00e9phone ou une adresse e-mail.",
    submitError: "La r\u00e9clamation n'a pas pu \u00eatre envoy\u00e9e.",
    submitSuccess: "La r\u00e9clamation a \u00e9t\u00e9 envoy\u00e9e avec succ\u00e8s.",
  },
  ru: {
    eyebrow: "\u0421\u0435\u0440\u0432\u0438\u0441 Fragmento",
    title: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 \u0441\u0435\u0440\u0432\u0438\u0441 Fragmento",
    intro:
      "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u0443\u0442\u044c \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0433\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0430. \u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0438\u043b\u0438 \u0434\u043e\u043f\u043e\u043a\u0443\u043f\u043a\u0443, \u0438\u043b\u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e \u0432 \u0441\u043b\u0443\u0436\u0431\u0443 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438.",
    purchaseBadge: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0430",
    purchaseTitle: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0430",
    purchaseText: "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440 \u043a\u0443\u0445\u043d\u0438 \u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0441 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u043c\u0438 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0430\u043c\u0438 \u0438\u043b\u0438 \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u0430\u043c\u0438.",
    complaintBadge: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f",
    complaintTitle: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    complaintText: "\u0421\u043e\u043e\u0431\u0449\u0438\u0442\u0435 \u043e \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0435 \u0441 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e\u043c \u0438\u043b\u0438 \u043a\u0443\u0445\u043d\u0435\u0439 \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0434\u0435\u0442\u0430\u043b\u0438 \u0432 \u0441\u043b\u0443\u0436\u0431\u0443 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438.",
    purchasePanelTitle: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0443 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    purchasePanelText: "\u0415\u0441\u043b\u0438 \u0430\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440\u0443 \u043d\u0443\u0436\u043d\u044b \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u0432\u043c\u0435\u0441\u0442\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438, \u043f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440.",
    openConfigurator: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440",
    back: "\u041d\u0430\u0437\u0430\u0434",
    formTitle: "\u0421\u0435\u0440\u0432\u0438\u0441\u043d\u0430\u044f \u0444\u043e\u0440\u043c\u0430",
    formIntro: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043d\u0438\u0436\u0435 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438.",
    contractNumber: "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    contractPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 736267",
    givenName: "\u0418\u043c\u044f",
    givenNamePlaceholder: "\u0418\u043c\u044f",
    surname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    surnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    gender: "\u041f\u043e\u043b",
    genderPlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435",
    genderFemale: "\u0416\u0435\u043d\u0441\u043a\u0438\u0439",
    genderMale: "\u041c\u0443\u0436\u0441\u043a\u043e\u0439",
    genderPreferNot: "\u041f\u0440\u0435\u0434\u043f\u043e\u0447\u0438\u0442\u0430\u044e \u043d\u0435 \u0443\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c",
    phone: "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430",
    phonePlaceholder: "+49 ...",
    email: "\u0410\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b",
    emailPlaceholder: "name@example.com",
    clientAddress: "\u0410\u0434\u0440\u0435\u0441 \u043a\u043b\u0438\u0435\u043d\u0442\u0430",
    clientCountry: "\u0421\u0442\u0440\u0430\u043d\u0430",
    clientCountryPlaceholder: "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f",
    clientAddressLine1: "\u0410\u0434\u0440\u0435\u0441, \u0441\u0442\u0440\u043e\u043a\u0430 1",
    clientAddressLine1Placeholder: "\u0423\u043b\u0438\u0446\u0430 \u0438 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043c\u0430",
    clientAddressLine2: "\u0410\u0434\u0440\u0435\u0441, \u0441\u0442\u0440\u043e\u043a\u0430 2",
    clientAddressLine2Placeholder: "\u041a\u0432\u0430\u0440\u0442\u0438\u0440\u0430, \u043f\u043e\u0434\u044a\u0435\u0437\u0434 \u0438 \u0442.\u0434.",
    clientPostalCode: "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441",
    clientPostalCodePlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 10115",
    clientCity: "\u0413\u043e\u0440\u043e\u0434",
    clientCityPlaceholder: "\u0411\u0435\u0440\u043b\u0438\u043d",
    clientFloor: "\u042d\u0442\u0430\u0436",
    clientFloorPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 3",
    clientUnitNumber: "\u041d\u043e\u043c\u0435\u0440 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b",
    clientUnitNumberPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 3B",
    landlordSection: "\u0410\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044c",
    landlordGivenName: "\u0418\u043c\u044f",
    landlordGivenNamePlaceholder: "\u0418\u043c\u044f",
    landlordSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0430\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail \u0430\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
    landlordEmailPlaceholder: "landlord@example.com",
    hausmeisterSection: "\u0425\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440",
    hausmeisterGivenName: "\u0418\u043c\u044f",
    hausmeisterGivenNamePlaceholder: "\u0418\u043c\u044f",
    hausmeisterSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    hausmeisterSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    hausmeisterPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterEmailPlaceholder: "hausmeister@example.com",
    problemDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b",
    problemPlaceholder: "\u041a\u0440\u0430\u0442\u043a\u043e \u043e\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443",
    serialNumber: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430",
    serialPlaceholder: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
    attachments: "\u0412\u043b\u043e\u0436\u0435\u043d\u0438\u044f (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    attachmentsHint: "PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u043e\u0444\u0438\u0441\u043d\u044b\u0435 \u0444\u0430\u0439\u043b\u044b \u2014 \u0434\u043e 5 \u0444\u0430\u0439\u043b\u043e\u0432, \u0434\u043e 4 \u041c\u0411 \u043a\u0430\u0436\u0434\u044b\u0439.",
    attachmentsClear: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435",
    attachmentsSelected: "\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432: {count}",
    attachmentsErrorTooMany: "\u041d\u0435 \u0431\u043e\u043b\u0435\u0435 5 \u0432\u043b\u043e\u0436\u0435\u043d\u0438\u0439.",
    attachmentsErrorFileTooLarge: "\u041a\u0430\u0436\u0434\u044b\u0439 \u0444\u0430\u0439\u043b \u2014 \u043d\u0435 \u0431\u043e\u043b\u0435\u0435 4 \u041c\u0411.",
    attachmentsErrorType: "\u0422\u0438\u043f \u0444\u0430\u0439\u043b\u0430 \u043d\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043d (PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f, Word/Excel).",
    contactHint: "\u041d\u0443\u0436\u0435\u043d \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u0441\u043f\u043e\u0441\u043e\u0431 \u0441\u0432\u044f\u0437\u0438: \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u0438\u043b\u0438 e-mail.",
    submit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    submitting: "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430...",
    contactError: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430 \u0438\u043b\u0438 \u0430\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b.",
    submitError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e.",
    submitSuccess: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430.",
  },
};

const INITIAL_FORM = {
  contractNumber: "",
  givenName: "",
  surname: "",
  gender: "",
  phone: "",
  email: "",
  clientCountry: "",
  clientAddressLine1: "",
  clientAddressLine2: "",
  clientPostalCode: "",
  clientCity: "",
  clientFloor: "",
  clientUnitNumber: "",
  landlordGivenName: "",
  landlordSurname: "",
  landlordPhone: "",
  landlordEmail: "",
  hausmeisterGivenName: "",
  hausmeisterSurname: "",
  hausmeisterPhone: "",
  hausmeisterEmail: "",
  problemDescription: "",
  serialNumber: "",
};

const EMPTY_CONTRACT_LOOKUP = {
  status: "idle",
  contractNumber: "",
  message: "",
}

function buildAutofillFieldsFromContract(contract) {
  const address = contract?.address || {};

  return {
    clientCountry: String(address.country || "").trim(),
    clientAddressLine1: String(address.address1 || "").trim(),
    clientAddressLine2: String(address.address2 || "").trim(),
    clientPostalCode: String(address.postalCode || "").trim(),
    clientCity: String(address.city || "").trim(),
    clientFloor: String(contract?.floor || "").trim(),
    clientUnitNumber: String(contract?.unitNumber || "").trim(),
  };
}

export default function ServiceClaimFlow() {
  const [language, setLanguage] = useState("de");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractLookup, setContractLookup] = useState(EMPTY_CONTRACT_LOOKUP);
  const [attachments, setAttachments] = useState([]);
  const [attachmentFieldKey, setAttachmentFieldKey] = useState(0);
  const languageMenuRef = useRef(null);
  const contractLookupTimeoutRef = useRef(null);
  const contractLookupRequestIdRef = useRef(0);

  const copy = COPY[language] || COPY.en;
  const fallbackCopy = COPY.en;
  const formValues = { ...INITIAL_FORM, ...form };
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
  const isComplaintMode = mode === "complaint";
  const hasContactMethod = useMemo(
    () => Boolean(formValues.phone.trim() || formValues.email.trim()),
    [formValues.email, formValues.phone],
  );
  const normalizedContractNumber = formValues.contractNumber.trim();

  function t(key) {
    return copy[key] || fallbackCopy[key] || "";
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      if (contractLookupTimeoutRef.current) {
        window.clearTimeout(contractLookupTimeoutRef.current);
      }
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleModeSelect(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
  }

  function handleFieldChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "contractNumber") {
      const nextContractNumber = value.trim();
      contractLookupRequestIdRef.current += 1;

      if (contractLookupTimeoutRef.current) {
        window.clearTimeout(contractLookupTimeoutRef.current);
      }

      if (!nextContractNumber) {
        setContractLookup(EMPTY_CONTRACT_LOOKUP);
      } else {
        setContractLookup({
          status: "loading",
          contractNumber: nextContractNumber,
          message: "",
        });

        const requestId = contractLookupRequestIdRef.current;
        contractLookupTimeoutRef.current = window.setTimeout(async () => {
          try {
            const response = await fetch(`/api/service-claims/contracts/${encodeURIComponent(nextContractNumber)}`);
            const payload = await response.json();

            if (requestId !== contractLookupRequestIdRef.current) {
              return;
            }

            if (!response.ok) {
              throw new Error(payload.error || t("contractLookupError"));
            }

            setForm((current) => {
              if (current.contractNumber.trim() !== nextContractNumber) {
                return current;
              }

              return {
                ...current,
                ...buildAutofillFieldsFromContract(payload.contract),
              };
            });

            setContractLookup({
              status: "found",
              contractNumber: nextContractNumber,
              message: "",
            });
          } catch (lookupError) {
            if (requestId !== contractLookupRequestIdRef.current) {
              return;
            }

            setContractLookup({
              status: "missing",
              contractNumber: nextContractNumber,
              message: lookupError.message || t("contractLookupError"),
            });
          }
        }, 450);
      }
    }

    if (error) {
      setError("");
    }
  }

  function handleAttachmentsSelected(event) {
    const picked = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!picked.length) {
      return;
    }

    setError("");
    setAttachments((prev) => {
      const next = [...prev];
      let message = "";
      for (const file of picked) {
        if (next.length >= MAX_CLAIM_ATTACHMENT_COUNT) {
          message = copy.attachmentsErrorTooMany;
          break;
        }
        if (file.size > MAX_CLAIM_ATTACHMENT_BYTES) {
          message = copy.attachmentsErrorFileTooLarge;
          continue;
        }
        if (!isClientAllowedAttachment(file)) {
          message = copy.attachmentsErrorType;
          continue;
        }
        next.push(file);
      }
      if (message) {
        queueMicrotask(() => setError(message));
      }
      return next;
    });
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function clearAttachments() {
    setAttachments([]);
    setAttachmentFieldKey((key) => key + 1);
    setError("");
  }

  function buildClientAddress() {
    return [
      formValues.clientAddressLine1.trim(),
      formValues.clientAddressLine2.trim(),
      `${formValues.clientPostalCode.trim()} ${formValues.clientCity.trim()}`.trim(),
      formValues.clientCountry.trim(),
      [
        formValues.clientFloor.trim() ? `Floor: ${formValues.clientFloor.trim()}` : "",
        formValues.clientUnitNumber.trim() ? `Unit: ${formValues.clientUnitNumber.trim()}` : "",
      ].filter(Boolean).join(", "),
    ].filter(Boolean).join(", ");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      contractLookup.status === "missing"
      && contractLookup.contractNumber === normalizedContractNumber
    ) {
      setError(contractLookup.message || t("contractLookupError"));
      return;
    }

    if (!hasContactMethod) {
      setError(copy.contactError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      const payload = {
        ...form,
        clientAddress: buildClientAddress(),
        language,
      };
      for (const [key, value] of Object.entries(payload)) {
        formData.append(key, value == null ? "" : String(value));
      }
      for (const file of attachments) {
        formData.append("attachments", file);
      }

      const response = await fetch("/api/service-claims", {
        method: "POST",
        body: formData,
      });

      const payloadResponse = await response.json();

      if (!response.ok) {
        throw new Error(payloadResponse.error || copy.submitError);
      }

      setSuccessMessage(payloadResponse.message || copy.submitSuccess);
      setForm(INITIAL_FORM);
      setAttachments([]);
      setAttachmentFieldKey((key) => key + 1);
      setContractLookup(EMPTY_CONTRACT_LOOKUP);
    } catch (submitError) {
      setError(submitError.message || copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="service-page">
      <section className="service-hero">
        <div
          ref={languageMenuRef}
          className={`service-language-switcher${isLanguageMenuOpen ? " is-open" : ""}`}
          aria-label="Language switcher"
        >
          <button
            type="button"
            className="service-language-switcher__trigger"
            onClick={() => setIsLanguageMenuOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={isLanguageMenuOpen}
          >
            <img src={selectedLanguage.flagSrc} alt="" aria-hidden="true" />
            <span>{selectedLanguage.label}</span>
          </button>
          <div className="service-language-switcher__menu" role="listbox" aria-activedescendant={`language-option-${language}`}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                id={`language-option-${option.code}`}
                type="button"
                role="option"
                aria-selected={language === option.code}
                className={`service-language-switcher__option${language === option.code ? " is-active" : ""}`}
                onClick={() => {
                  setLanguage(option.code);
                  setIsLanguageMenuOpen(false);
                }}
              >
                <img src={option.flagSrc} alt="" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="service-hero__top">
          <div className="service-hero__content">
            <div className="service-hero__brand">
              <Image src="/img/fragmentologo-cropped.png" alt="Fragmento" width={168} height={54} className="service-hero__logo" />
            </div>
            <h1>{copy.title}</h1>
          </div>

          <div className="service-hero__mascot" aria-hidden="true">
            <Image src="/img/worker-icon-transparent.png" alt="" width={220} height={220} className="service-hero__mascot-image" />
          </div>
        </div>

        <div className="service-choice-grid">
          <button
            type="button"
            className={`service-choice-card${mode === "nachkauf" ? " is-active" : ""}`}
            onClick={() => handleModeSelect("nachkauf")}
          >
            <span className="service-choice-card__label">{copy.purchaseBadge}</span>
            <strong>{copy.purchaseTitle}</strong>
            <p>{copy.purchaseText}</p>
          </button>
          <button
            type="button"
            className={`service-choice-card${isComplaintMode ? " is-active" : ""}`}
            onClick={() => handleModeSelect("complaint")}
          >
            <span className="service-choice-card__label">{copy.complaintBadge}</span>
            <strong>{copy.complaintTitle}</strong>
            <p>{copy.complaintText}</p>
          </button>
        </div>
      </section>

      {mode === "nachkauf" ? (
        <section className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.purchaseBadge}</p>
            <h2>{copy.purchasePanelTitle}</h2>
            <p>{copy.purchasePanelText}</p>
          </div>
          <div className="service-panel__actions">
            <Link href="/" className="service-button service-button--primary">
              {copy.openConfigurator}
            </Link>
            <button
              type="button"
              className="service-button service-button--secondary"
              onClick={() => setMode("")}
            >
              {copy.back}
            </button>
          </div>
        </section>
      ) : null}

      {isComplaintMode ? (
        <section className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.complaintBadge}</p>
            <h2>{copy.formTitle}</h2>
            <p>{copy.formIntro}</p>
          </div>

          <form className="service-form" onSubmit={handleSubmit}>
            <label className="service-field">
              <span>{copy.contractNumber}</span>
              <input
                type="text"
                value={formValues.contractNumber}
                onChange={(event) => handleFieldChange("contractNumber", event.target.value)}
                placeholder={copy.contractPlaceholder}
                required
              />
              {contractLookup.status === "loading" ? (
                <p className="service-form__hint">{t("contractLookupLoading")}</p>
              ) : null}
              {contractLookup.status === "found" && contractLookup.contractNumber === normalizedContractNumber ? (
                <p className="service-form__success">{t("contractLookupSuccess")}</p>
              ) : null}
              {contractLookup.status === "missing" && contractLookup.contractNumber === normalizedContractNumber ? (
                <p className="service-form__error">{contractLookup.message || t("contractLookupError")}</p>
              ) : null}
            </label>

            <div className="service-field-grid service-field-grid--3">
              <label className="service-field">
                <span>{copy.gender}</span>
                <select
                  value={formValues.gender}
                  onChange={(event) => handleFieldChange("gender", event.target.value)}
                  required
                >
                  <option value="">{copy.genderPlaceholder}</option>
                  <option value="female">{copy.genderFemale}</option>
                  <option value="male">{copy.genderMale}</option>
                  <option value="prefer_not_to_say">{copy.genderPreferNot}</option>
                </select>
              </label>

              <label className="service-field">
                <span>{copy.givenName}</span>
                <input
                  type="text"
                  value={formValues.givenName}
                  onChange={(event) => handleFieldChange("givenName", event.target.value)}
                  placeholder={copy.givenNamePlaceholder}
                  required
                />
              </label>

              <label className="service-field">
                <span>{copy.surname}</span>
                <input
                  type="text"
                  value={formValues.surname}
                  onChange={(event) => handleFieldChange("surname", event.target.value)}
                  placeholder={copy.surnamePlaceholder}
                  required
                />
              </label>
            </div>

            <div className="service-field-grid">
              <label className="service-field">
                <span>{copy.phone}</span>
                <input
                  type="tel"
                  value={formValues.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder={copy.phonePlaceholder}
                />
              </label>

              <label className="service-field">
                <span>{copy.email}</span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                />
              </label>
            </div>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.clientAddress}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.clientCountry}</span>
                  <input
                    type="text"
                    value={formValues.clientCountry}
                    onChange={(event) => handleFieldChange("clientCountry", event.target.value)}
                    placeholder={copy.clientCountryPlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.clientCity}</span>
                  <input
                    type="text"
                    value={formValues.clientCity}
                    onChange={(event) => handleFieldChange("clientCity", event.target.value)}
                    placeholder={copy.clientCityPlaceholder}
                    required
                  />
                </label>
              </div>

              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.clientPostalCode}</span>
                  <input
                    type="text"
                    value={formValues.clientPostalCode}
                    onChange={(event) => handleFieldChange("clientPostalCode", event.target.value)}
                    placeholder={copy.clientPostalCodePlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.clientFloor}</span>
                  <input
                    type="text"
                    value={formValues.clientFloor}
                    onChange={(event) => handleFieldChange("clientFloor", event.target.value)}
                    placeholder={copy.clientFloorPlaceholder}
                  />
                </label>
              </div>

              <label className="service-field">
                <span>{copy.clientAddressLine1}</span>
                <input
                  type="text"
                  value={formValues.clientAddressLine1}
                  onChange={(event) => handleFieldChange("clientAddressLine1", event.target.value)}
                  placeholder={copy.clientAddressLine1Placeholder}
                  required
                />
              </label>

              <label className="service-field">
                <span>{copy.clientAddressLine2}</span>
                <input
                  type="text"
                  value={formValues.clientAddressLine2}
                  onChange={(event) => handleFieldChange("clientAddressLine2", event.target.value)}
                  placeholder={copy.clientAddressLine2Placeholder}
                />
              </label>

              <label className="service-field">
                <span>{copy.clientUnitNumber}</span>
                <input
                  type="text"
                  value={formValues.clientUnitNumber}
                  onChange={(event) => handleFieldChange("clientUnitNumber", event.target.value)}
                  placeholder={copy.clientUnitNumberPlaceholder}
                />
              </label>
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.landlordSection}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.landlordGivenName}</span>
                  <input
                    type="text"
                    value={formValues.landlordGivenName}
                    onChange={(event) => handleFieldChange("landlordGivenName", event.target.value)}
                    placeholder={copy.landlordGivenNamePlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.landlordSurname}</span>
                  <input
                    type="text"
                    value={formValues.landlordSurname}
                    onChange={(event) => handleFieldChange("landlordSurname", event.target.value)}
                    placeholder={copy.landlordSurnamePlaceholder}
                    required
                  />
                </label>
              </div>

              <label className="service-field">
                <span>{copy.landlordPhone}</span>
                <input
                  type="tel"
                  value={formValues.landlordPhone}
                  onChange={(event) => handleFieldChange("landlordPhone", event.target.value)}
                  placeholder={copy.landlordPhonePlaceholder}
                />
              </label>

              <label className="service-field">
                <span>{copy.landlordEmail}</span>
                <input
                  type="email"
                  value={formValues.landlordEmail}
                  onChange={(event) => handleFieldChange("landlordEmail", event.target.value)}
                  placeholder={copy.landlordEmailPlaceholder}
                />
              </label>
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.hausmeisterSection}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.hausmeisterGivenName}</span>
                  <input
                    type="text"
                    value={formValues.hausmeisterGivenName}
                    onChange={(event) => handleFieldChange("hausmeisterGivenName", event.target.value)}
                    placeholder={copy.hausmeisterGivenNamePlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.hausmeisterSurname}</span>
                  <input
                    type="text"
                    value={formValues.hausmeisterSurname}
                    onChange={(event) => handleFieldChange("hausmeisterSurname", event.target.value)}
                    placeholder={copy.hausmeisterSurnamePlaceholder}
                    required
                  />
                </label>
              </div>

              <label className="service-field">
                <span>{copy.hausmeisterPhone}</span>
                <input
                  type="tel"
                  value={formValues.hausmeisterPhone}
                  onChange={(event) => handleFieldChange("hausmeisterPhone", event.target.value)}
                  placeholder={copy.hausmeisterPhonePlaceholder}
                />
              </label>

              <label className="service-field">
                <span>{copy.hausmeisterEmail}</span>
                <input
                  type="email"
                  value={formValues.hausmeisterEmail}
                  onChange={(event) => handleFieldChange("hausmeisterEmail", event.target.value)}
                  placeholder={copy.hausmeisterEmailPlaceholder}
                />
              </label>
            </section>

            <label className="service-field">
              <span>{copy.problemDescription}</span>
              <textarea
                value={formValues.problemDescription}
                onChange={(event) => handleFieldChange("problemDescription", event.target.value)}
                placeholder={copy.problemPlaceholder}
                rows={6}
                required
              />
            </label>

            <label className="service-field">
              <span>{copy.serialNumber}</span>
              <input
                type="text"
                value={formValues.serialNumber}
                onChange={(event) => handleFieldChange("serialNumber", event.target.value)}
                placeholder={copy.serialPlaceholder}
                required
              />
            </label>

            <div className="service-field service-field--attachments">
              <span>{copy.attachments}</span>
              <p className="service-form__hint service-form__hint--attachments">{copy.attachmentsHint}</p>
              <input
                key={attachmentFieldKey}
                type="file"
                className="service-field__file"
                accept={CLAIM_ATTACHMENT_ACCEPT}
                multiple
                onChange={handleAttachmentsSelected}
              />
              {attachments.length > 0 ? (
                <div className="service-attachments">
                  <p className="service-attachments__summary">
                    {copy.attachmentsSelected.replace("{count}", String(attachments.length))}
                  </p>
                  <ul className="service-attachments__list">
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className="service-attachments__item">
                        <span className="service-attachments__name">{file.name}</span>
                        <button
                          type="button"
                          className="service-attachments__remove"
                          onClick={() => removeAttachment(index)}
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="service-button service-button--secondary service-attachments__clear"
                    onClick={clearAttachments}
                  >
                    {copy.attachmentsClear}
                  </button>
                </div>
              ) : null}
            </div>

            {!hasContactMethod ? <p className="service-form__hint">{copy.contactHint}</p> : null}
            {error ? <p className="service-form__error">{error}</p> : null}
            {successMessage ? <p className="service-form__success">{successMessage}</p> : null}

            <div className="service-form__actions">
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={() => setMode("")}
                disabled={isSubmitting}
              >
                {copy.back}
              </button>
              <button type="submit" className="service-button service-button--primary" disabled={isSubmitting}>
                {isSubmitting ? copy.submitting : copy.submit}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
