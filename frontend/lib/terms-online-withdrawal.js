import { WITHDRAWAL_URL, WITHDRAWAL_FORM_PDF_URL } from "./legal-links.js";

// Supplements missing from the existing translations of the August 2026 AGB.
export const onlineWithdrawalCopy = {
  en: {
    online: `The customer may also exercise the right of withdrawal online using the “Withdraw from contract” function in the footer of the Fragmento website (${WITHDRAWAL_URL}). If the customer uses this online function, the entrepreneur will promptly send an acknowledgement on a durable medium (for example, by email), including the content of the withdrawal declaration and the date and time it was received.`,
    form: "The model withdrawal form is available here as a PDF to download and print:",
    end: "END OF THE WITHDRAWAL INSTRUCTION",
  },
  es: {
    online: `El cliente también puede ejercer su derecho de desistimiento en línea mediante la función «Desistir del contrato» en el pie de página del sitio web de Fragmento (${WITHDRAWAL_URL}). Si utiliza esta función, el empresario enviará sin demora un acuse de recibo en un soporte duradero (por ejemplo, por correo electrónico), con el contenido de la declaración de desistimiento y la fecha y hora de su recepción.`,
    form: "El formulario de desistimiento está disponible aquí en PDF para descargar e imprimir:",
    end: "FIN DE LA INFORMACIÓN SOBRE EL DESISTIMIENTO",
  },
  fr: {
    online: `Le client peut également exercer son droit de rétractation en ligne à l’aide de la fonction « Se rétracter du contrat » dans le pied de page du site Fragmento (${WITHDRAWAL_URL}). S’il utilise cette fonction, l’entrepreneur lui transmet sans délai un accusé de réception sur un support durable (par exemple, par e-mail), indiquant le contenu de la déclaration de rétractation ainsi que la date et l’heure de sa réception.`,
    form: "Le formulaire de rétractation est disponible ici au format PDF à télécharger et à imprimer :",
    end: "FIN DES INFORMATIONS SUR LA RÉTRACTATION",
  },
  ru: {
    online: `Клиент также может воспользоваться правом отказа онлайн через функцию «Отказаться от договора» в нижней части сайта Fragmento (${WITHDRAWAL_URL}). При использовании этой функции предприниматель незамедлительно отправляет подтверждение получения на долговечном носителе (например, по электронной почте), содержащее текст заявления об отказе, а также дату и время его получения.`,
    form: "Образец формы отказа доступен здесь в формате PDF для скачивания и печати:",
    end: "КОНЕЦ ИНФОРМАЦИИ О ПРАВЕ НА ОТКАЗ",
  },
  tr: {
    online: `Müşteri, Fragmento web sitesinin alt kısmındaki «Sözleşmeden cay» işlevini kullanarak cayma hakkını çevrim içi olarak da kullanabilir (${WITHDRAWAL_URL}). Bu işlev kullanıldığında girişimci, cayma beyanının içeriğini ve alındığı tarih ile saati içeren bir alındı onayını kalıcı bir veri saklayıcısıyla (örneğin e-posta ile) gecikmeksizin müşteriye iletir.`,
    form: "Örnek cayma formu, indirmek ve yazdırmak için burada PDF olarak mevcuttur:",
    end: "CAYMA BİLGİLENDİRMESİNİN SONU",
  },
};

export function addOnlineWithdrawal(terms, language) {
  const copy = onlineWithdrawalCopy[language];
  if (!copy) return terms;
  return {
    ...terms,
    sections: terms.sections.map((section, index) => {
      if (index !== 4) return section;
      const paragraphs = section.callout.paragraphs;
      return {
        ...section,
        callout: {
          ...section.callout,
          paragraphs: [
            ...paragraphs.slice(0, 2), copy.online, ...paragraphs.slice(2),
            copy.form, WITHDRAWAL_FORM_PDF_URL, copy.end,
          ],
        },
      };
    }),
  };
}
