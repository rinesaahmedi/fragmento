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
    fullName: "Vor- und Nachname",
    fullNamePlaceholder: "Vollst\u00e4ndiger Name",
    phone: "Telefonnummer",
    phonePlaceholder: "+49 ...",
    email: "E-Mail-Adresse",
    emailPlaceholder: "name@beispiel.de",
    clientAddress: "Adresse des Kunden",
    clientAddressPlaceholder: "Stra\u00dfe, Hausnummer, PLZ, Ort",
    landlordSection: "Vermieter",
    landlordName: "Name des Vermieters",
    landlordNamePlaceholder: "Vollst\u00e4ndiger Name",
    landlordPhone: "Telefon Vermieter",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-Mail Vermieter",
    landlordEmailPlaceholder: "vermieter@beispiel.de",
    hausmeisterSection: "Hausmeister",
    hausmeisterName: "Name des Hausmeisters",
    hausmeisterNamePlaceholder: "Vollst\u00e4ndiger Name",
    hausmeisterPhone: "Telefon Hausmeister",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-Mail Hausmeister",
    hausmeisterEmailPlaceholder: "hausmeister@beispiel.de",
    problemDescription: "Problembeschreibung in Stichworten",
    problemPlaceholder: "Beschreibe das Problem kurz",
    serialNumber: "Seriennummer des E-Ger\u00e4tes",
    serialPlaceholder: "Seriennummer",
    contactHint: "Mindestens eine Kontaktm\u00f6glichkeit ist erforderlich: Telefonnummer oder E-Mail-Adresse.",
    submit: "Reklamation senden",
    submitting: "Wird gesendet...",
    contactError: "Bitte gib mindestens eine Telefonnummer oder E-Mail-Adresse an.",
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
    fullName: "Full name",
    fullNamePlaceholder: "Full name",
    phone: "Phone number",
    phonePlaceholder: "+49 ...",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    clientAddress: "Client address",
    clientAddressPlaceholder: "Street, house number, postal code, city",
    landlordSection: "Landlord",
    landlordName: "Landlord name",
    landlordNamePlaceholder: "Full name",
    landlordPhone: "Landlord phone",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Landlord email",
    landlordEmailPlaceholder: "landlord@example.com",
    hausmeisterSection: "Property manager",
    hausmeisterName: "Property manager name",
    hausmeisterNamePlaceholder: "Full name",
    hausmeisterPhone: "Property manager phone",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Property manager email",
    hausmeisterEmailPlaceholder: "manager@example.com",
    problemDescription: "Problem description",
    problemPlaceholder: "Describe the issue briefly",
    serialNumber: "Serial number of the appliance",
    serialPlaceholder: "Serial number",
    contactHint: "At least one contact method is required: phone number or email address.",
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
    fullName: "Ad ve soyad",
    fullNamePlaceholder: "Ad soyad",
    phone: "Telefon numaras\u0131",
    phonePlaceholder: "+49 ...",
    email: "E-posta adresi",
    emailPlaceholder: "isim@example.com",
    clientAddress: "M\u00fc\u015fteri adresi",
    clientAddressPlaceholder: "Sokak, bina no, posta kodu, \u015fehir",
    landlordSection: "Ev sahibi",
    landlordName: "Ev sahibi ad\u0131",
    landlordNamePlaceholder: "Ad soyad",
    landlordPhone: "Ev sahibi telefonu",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Ev sahibi e-postas\u0131",
    landlordEmailPlaceholder: "evsahibi@example.com",
    hausmeisterSection: "Bina g\u00f6revlisi",
    hausmeisterName: "Bina g\u00f6revlisi ad\u0131",
    hausmeisterNamePlaceholder: "Ad soyad",
    hausmeisterPhone: "Bina g\u00f6revlisi telefonu",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Bina g\u00f6revlisi e-postas\u0131",
    hausmeisterEmailPlaceholder: "gorevli@example.com",
    problemDescription: "Sorun a\u00e7\u0131klamas\u0131",
    problemPlaceholder: "Sorunu k\u0131saca a\u00e7\u0131klay\u0131n",
    serialNumber: "Cihaz seri numaras\u0131",
    serialPlaceholder: "Seri numaras\u0131",
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
    fullName: "Nombre y apellidos",
    fullNamePlaceholder: "Nombre completo",
    phone: "N\u00famero de tel\u00e9fono",
    phonePlaceholder: "+49 ...",
    email: "Direcci\u00f3n de correo electr\u00f3nico",
    emailPlaceholder: "nombre@ejemplo.com",
    clientAddress: "Direcci\u00f3n del cliente",
    clientAddressPlaceholder: "Calle, n\u00famero, c\u00f3digo postal, ciudad",
    landlordSection: "Propietario",
    landlordName: "Nombre del propietario",
    landlordNamePlaceholder: "Nombre completo",
    landlordPhone: "Tel\u00e9fono del propietario",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Correo del propietario",
    landlordEmailPlaceholder: "propietario@ejemplo.com",
    hausmeisterSection: "Encargado",
    hausmeisterName: "Nombre del encargado",
    hausmeisterNamePlaceholder: "Nombre completo",
    hausmeisterPhone: "Tel\u00e9fono del encargado",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Correo del encargado",
    hausmeisterEmailPlaceholder: "encargado@ejemplo.com",
    problemDescription: "Descripci\u00f3n del problema",
    problemPlaceholder: "Describa brevemente el problema",
    serialNumber: "N\u00famero de serie del electrodom\u00e9stico",
    serialPlaceholder: "N\u00famero de serie",
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
    fullName: "Nom et pr\u00e9nom",
    fullNamePlaceholder: "Nom complet",
    phone: "Num\u00e9ro de t\u00e9l\u00e9phone",
    phonePlaceholder: "+49 ...",
    email: "Adresse e-mail",
    emailPlaceholder: "nom@exemple.com",
    clientAddress: "Adresse du client",
    clientAddressPlaceholder: "Rue, num\u00e9ro, code postal, ville",
    landlordSection: "Propri\u00e9taire",
    landlordName: "Nom du propri\u00e9taire",
    landlordNamePlaceholder: "Nom complet",
    landlordPhone: "T\u00e9l\u00e9phone du propri\u00e9taire",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail du propri\u00e9taire",
    landlordEmailPlaceholder: "proprietaire@exemple.com",
    hausmeisterSection: "Gardien",
    hausmeisterName: "Nom du gardien",
    hausmeisterNamePlaceholder: "Nom complet",
    hausmeisterPhone: "T\u00e9l\u00e9phone du gardien",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail du gardien",
    hausmeisterEmailPlaceholder: "gardien@exemple.com",
    problemDescription: "Description du probl\u00e8me",
    problemPlaceholder: "D\u00e9crivez bri\u00e8vement le probl\u00e8me",
    serialNumber: "Num\u00e9ro de s\u00e9rie de l'appareil",
    serialPlaceholder: "Num\u00e9ro de s\u00e9rie",
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
    fullName: "\u0418\u043c\u044f \u0438 \u0444\u0430\u043c\u0438\u043b\u0438\u044f",
    fullNamePlaceholder: "\u041f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f",
    phone: "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430",
    phonePlaceholder: "+49 ...",
    email: "\u0410\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b",
    emailPlaceholder: "name@example.com",
    clientAddress: "\u0410\u0434\u0440\u0435\u0441 \u043a\u043b\u0438\u0435\u043d\u0442\u0430",
    clientAddressPlaceholder: "\u0423\u043b\u0438\u0446\u0430, \u0434\u043e\u043c, \u0438\u043d\u0434\u0435\u043a\u0441, \u0433\u043e\u0440\u043e\u0434",
    landlordSection: "\u0410\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044c",
    landlordName: "\u0418\u043c\u044f \u0430\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
    landlordNamePlaceholder: "\u041f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f",
    landlordPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0430\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail \u0430\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
    landlordEmailPlaceholder: "landlord@example.com",
    hausmeisterSection: "\u0425\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440",
    hausmeisterName: "\u0418\u043c\u044f \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterNamePlaceholder: "\u041f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f",
    hausmeisterPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterEmailPlaceholder: "hausmeister@example.com",
    problemDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b",
    problemPlaceholder: "\u041a\u0440\u0430\u0442\u043a\u043e \u043e\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443",
    serialNumber: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430",
    serialPlaceholder: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
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
  fullName: "",
  phone: "",
  email: "",
  clientAddress: "",
  landlordName: "",
  landlordPhone: "",
  landlordEmail: "",
  hausmeisterName: "",
  hausmeisterPhone: "",
  hausmeisterEmail: "",
  problemDescription: "",
  serialNumber: "",
};

export default function ServiceClaimFlow() {
  const [language, setLanguage] = useState("de");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const languageMenuRef = useRef(null);

  const copy = COPY[language] || COPY.en;
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
  const isComplaintMode = mode === "complaint";
  const hasContactMethod = useMemo(
    () => Boolean(form.phone.trim() || form.email.trim()),
    [form.email, form.phone],
  );

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
    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasContactMethod) {
      setError(copy.contactError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/service-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, language }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || copy.submitError);
      }

      setSuccessMessage(payload.message || copy.submitSuccess);
      setForm(INITIAL_FORM);
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
              <p className="service-hero__eyebrow">{copy.eyebrow}</p>
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
                value={form.contractNumber}
                onChange={(event) => handleFieldChange("contractNumber", event.target.value)}
                placeholder={copy.contractPlaceholder}
                required
              />
            </label>

            <label className="service-field">
              <span>{copy.fullName}</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => handleFieldChange("fullName", event.target.value)}
                placeholder={copy.fullNamePlaceholder}
                required
              />
            </label>

            <div className="service-field-grid">
              <label className="service-field">
                <span>{copy.phone}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder={copy.phonePlaceholder}
                />
              </label>

              <label className="service-field">
                <span>{copy.email}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                />
              </label>
            </div>

            <label className="service-field">
              <span>{copy.clientAddress}</span>
              <textarea
                value={form.clientAddress}
                onChange={(event) => handleFieldChange("clientAddress", event.target.value)}
                placeholder={copy.clientAddressPlaceholder}
                rows={3}
                required
              />
            </label>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.landlordSection}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.landlordName}</span>
                  <input
                    type="text"
                    value={form.landlordName}
                    onChange={(event) => handleFieldChange("landlordName", event.target.value)}
                    placeholder={copy.landlordNamePlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.landlordPhone}</span>
                  <input
                    type="tel"
                    value={form.landlordPhone}
                    onChange={(event) => handleFieldChange("landlordPhone", event.target.value)}
                    placeholder={copy.landlordPhonePlaceholder}
                  />
                </label>
              </div>

              <label className="service-field">
                <span>{copy.landlordEmail}</span>
                <input
                  type="email"
                  value={form.landlordEmail}
                  onChange={(event) => handleFieldChange("landlordEmail", event.target.value)}
                  placeholder={copy.landlordEmailPlaceholder}
                />
              </label>
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.hausmeisterSection}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.hausmeisterName}</span>
                  <input
                    type="text"
                    value={form.hausmeisterName}
                    onChange={(event) => handleFieldChange("hausmeisterName", event.target.value)}
                    placeholder={copy.hausmeisterNamePlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>{copy.hausmeisterPhone}</span>
                  <input
                    type="tel"
                    value={form.hausmeisterPhone}
                    onChange={(event) => handleFieldChange("hausmeisterPhone", event.target.value)}
                    placeholder={copy.hausmeisterPhonePlaceholder}
                  />
                </label>
              </div>

              <label className="service-field">
                <span>{copy.hausmeisterEmail}</span>
                <input
                  type="email"
                  value={form.hausmeisterEmail}
                  onChange={(event) => handleFieldChange("hausmeisterEmail", event.target.value)}
                  placeholder={copy.hausmeisterEmailPlaceholder}
                />
              </label>
            </section>

            <label className="service-field">
              <span>{copy.problemDescription}</span>
              <textarea
                value={form.problemDescription}
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
                value={form.serialNumber}
                onChange={(event) => handleFieldChange("serialNumber", event.target.value)}
                placeholder={copy.serialPlaceholder}
                required
              />
            </label>

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
