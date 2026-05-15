import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";
import { prisma } from "../../../../lib/prisma";

const COPY = {
  en: {
    greetingReply: "Hi. I can help you with the claim.",
    greetingFollowUp: "Tell me what is wrong, or ask about wording, photos, or the right kitchen area.",
    greetingExamples:
      "For example: \"The sink is leaking\", \"What photos should I attach?\", or \"Which area should I select?\"",
    unavailable: "The claim helper could not answer that right now.",
    openingGeneral: "Here is the fastest way to make the claim clearer for service support.",
    openingArea: "For {label}, here is what service support usually needs first.",
    includeTitle: "Include",
    nextTitle: "Suggested next steps in the form",
    fallbackQuestion: "Please tell me what is not working, what you already observed, and which kitchen part is affected.",
    itemStarted: "When the issue started and whether it is constant or intermittent.",
    itemVisibleDamage: "What is visibly damaged, loose, leaking, blocked, or not reacting.",
    itemPhotoSet: "One overview photo and one close-up photo of the affected area.",
    itemErrorCode: "Any display message, blinking light, or error code if an appliance is involved.",
    itemNoiseSmell: "Whether there is unusual noise, smell, heat, or vibration.",
    itemLeak: "Where the water appears, whether it happens during use or also while idle, and how much water there is.",
    itemDishwasher: "Mention whether it does not start, does not drain, leaks, or shows an error.",
    itemWashingMachine: "Mention whether it does not spin, does not drain, leaks, or stops during the programme.",
    itemOvenHob: "State whether the oven or the hob is affected, which heating zone fails, and whether any fuse tripped.",
    itemFridge: "Mention whether the problem is cooling, icing, water, noise, or a door seal issue.",
    itemHood: "Mention whether the fan, extraction power, lighting, or noise level is the problem.",
    itemSink: "Describe whether the issue is a leak, blockage, bad odour, or damaged fitting.",
    itemCabinet: "Describe whether the issue is a hinge, drawer runner, front alignment, scratch, crack, or missing fitting.",
    nextMissingContract: "Add the contract number first so the support team can identify the kitchen setup.",
    nextMissingArea: "Select the affected kitchen area if possible so the claim is easier to route.",
    nextMissingSerial: "Add the appliance serial number if an electrical appliance is involved.",
    nextMissingSerialImage: "Upload a photo of the serial number label if you have it.",
    nextMissingAttachments: "Attach at least one photo if the problem is visible or physical.",
    nextMissingAvailability: "Add availability if a technician visit may be needed.",
    nextMissingContact: "Provide at least one contact option so the team can reach you.",
    nextAttachmentReady: "You already added attachments, so keep the written description short and precise.",
    askFollowUp: "If you want, ask me for a sample wording for the final problem description.",
    briefPrompt: "Please tell me what is wrong, which kitchen part is affected, and what you have already noticed.",
    briefPromptWithArea: "Please tell me what is wrong with {label} and what you have already noticed.",
    sampleWordingIntro: "You can use this wording:",
    sampleWordingAreaFallback: "the affected area",
    sampleWordingAreaLabel: "Affected area",
    sampleWordingFallback:
      "The issue started [when]. It is [constant/intermittent]. The affected area is [area]. I noticed [visible issue]. Please check and advise on the next step.",
    sampleWordingOutro: "Please check and advise on the next step.",
    knowledgeOpening: "I found matching Amica dishwasher troubleshooting guidance for this issue.",
    knowledgeOpeningArea: "For {label}, I found matching Amica dishwasher troubleshooting guidance.",
    knowledgeCodeTitle: "Matching guidance",
    knowledgeSymptomsTitle: "What it usually means",
    knowledgeChecksTitle: "Check first",
    knowledgeCausesTitle: "Possible cause",
    knowledgeActionsTitle: "Immediate steps",
    knowledgeGeneralCode: "Code",
  },
  de: {
    greetingReply: "Hallo. Ich helfe Ihnen bei der Reklamation.",
    greetingFollowUp: "Schreiben Sie einfach, was nicht funktioniert, oder fragen Sie nach Hilfe bei Formulierung, Fotos oder dem richtigen Küchenbereich.",
    greetingExamples:
      "Zum Beispiel: \"Die Spüle ist undicht\", \"Welche Fotos soll ich anhängen?\" oder \"Welchen Bereich soll ich auswählen?\"",
    unavailable: "Die Reklamationshilfe konnte dazu gerade keine Antwort geben.",
    openingGeneral: "So wird die Reklamation für den Service am schnellsten klarer.",
    openingArea: "Für {label} benötigt der Service meistens zuerst diese Angaben.",
    includeTitle: "Bitte angeben",
    nextTitle: "Sinnvolle nächste Schritte im Formular",
    fallbackQuestion: "Beschreiben Sie bitte, was genau nicht funktioniert, was Sie schon beobachtet haben und welcher Küchenbereich betroffen ist.",
    itemStarted: "Seit wann das Problem besteht und ob es dauerhaft oder nur zeitweise auftritt.",
    itemVisibleDamage: "Was sichtbar beschädigt, locker, undicht, blockiert oder ohne Reaktion ist.",
    itemPhotoSet: "Ein Übersichtsfoto und ein Nahfoto vom betroffenen Bereich.",
    itemErrorCode: "Jede Anzeige, Blinkmeldung oder Fehlernummer, falls ein Elektrogerät betroffen ist.",
    itemNoiseSmell: "Ob ungewohnte Geräusche, Geruch, Hitze oder Vibration auftreten.",
    itemLeak: "Wo Wasser austritt, ob es nur bei Benutzung oder auch im Ruhezustand passiert und wie stark es austritt.",
    itemDishwasher: "Nennen Sie, ob der Geschirrspüler nicht startet, nicht abpumpt, undicht ist oder einen Fehler zeigt.",
    itemWashingMachine: "Nennen Sie, ob die Waschmaschine nicht schleudert, nicht abpumpt, Wasser verliert oder im Programm stoppt.",
    itemOvenHob: "Geben Sie an, ob Backofen oder Kochfeld betroffen sind, welche Zone nicht funktioniert und ob eine Sicherung ausgelöst hat.",
    itemFridge: "Nennen Sie, ob es um Kühlung, Vereisung, Wasser, Geräusche oder die Türdichtung geht.",
    itemHood: "Nennen Sie, ob Lüfter, Absaugleistung, Beleuchtung oder Lautstärke das Problem sind.",
    itemSink: "Beschreiben Sie, ob es um Undichtigkeit, Verstopfung, Geruch oder eine beschädigte Armatur geht.",
    itemCabinet: "Beschreiben Sie, ob Scharnier, Auszug, Frontausrichtung, Kratzer, Riss oder ein fehlender Beschlag betroffen sind.",
    nextMissingContract: "Trage zuerst die Vertragsnummer ein, damit das Team die Küche eindeutig zuordnen kann.",
    nextMissingArea: "Wähle wenn möglich den betroffenen Küchenbereich aus, damit die Reklamation besser zugeordnet wird.",
    nextMissingSerial: "Trage die Seriennummer ein, wenn ein Elektrogerät betroffen ist.",
    nextMissingSerialImage: "Lade nach Möglichkeit ein Foto vom Seriennummernschild hoch.",
    nextMissingAttachments: "Füge mindestens ein Foto hinzu, wenn der Schaden sichtbar oder physisch ist.",
    nextMissingAvailability: "Ergänze eine Erreichbarkeit, falls wahrscheinlich ein Technikertermin nötig ist.",
    nextMissingContact: "Hinterlegen Sie mindestens eine Kontaktmöglichkeit, damit der Service Sie erreichen kann.",
    nextAttachmentReady: "Sie haben bereits Anhänge hinzugefügt. Halten Sie die schriftliche Beschreibung jetzt kurz und präzise.",
    askFollowUp: "Wenn Sie möchten, formuliere ich Ihnen als Nächstes einen passenden Text für die Problembeschreibung.",
    briefPrompt: "Beschreiben Sie bitte kurz, was nicht funktioniert, welcher Küchenbereich betroffen ist und was Sie bereits beobachtet haben.",
    briefPromptWithArea: "Beschreiben Sie bitte kurz, was bei {label} nicht funktioniert und was Sie bereits beobachtet haben.",
    sampleWordingIntro: "Sie können zum Beispiel so schreiben:",
    sampleWordingAreaFallback: "der betroffene Bereich",
    sampleWordingAreaLabel: "Betroffener Bereich",
    sampleWordingFallback:
      "Das Problem besteht seit [Zeitpunkt]. Es tritt [dauerhaft/gelegentlich] auf. Betroffen ist [Bereich]. Sichtbar ist [Beobachtung]. Bitte prüfen Sie den Fall und teilen Sie mir die nächsten Schritte mit.",
    sampleWordingOutro: "Bitte prüfen Sie den Fall und teilen Sie mir die nächsten Schritte mit.",
    knowledgeOpening: "Ich habe passende Hinweise zu Amica-Geschirrspülern für dieses Problem gefunden.",
    knowledgeOpeningArea: "Für {label} habe ich passende Hinweise zu Amica-Geschirrspülern gefunden.",
    knowledgeCodeTitle: "Passende Hinweise",
    knowledgeSymptomsTitle: "Das bedeutet meist",
    knowledgeChecksTitle: "Zuerst prüfen",
    knowledgeCausesTitle: "Mögliche Ursache",
    knowledgeActionsTitle: "Sofortmaßnahmen",
    knowledgeGeneralCode: "Code",
  },
  tr: {
    greetingReply: "Merhaba. Şikayet konusunda yardımcı olabilirim.",
    greetingFollowUp: "Ne olduğunu yazın ya da metin, fotoğraf veya doğru mutfak alanı hakkında soru sorun.",
    greetingExamples:
      "Örneğin: \"Eviye sızdırıyor\", \"Hangi fotoğrafları eklemeliyim?\" veya \"Hangi alanı seçmeliyim?\"",
    unavailable: "Şikayet yardımcısı şu anda buna yanıt veremedi.",
    openingGeneral: "Servis ekibi için şikayeti en hızlı şekilde netleştirmenin yolu bu.",
    openingArea: "{label} için servis ekibinin genelde ilk istediği bilgiler bunlardır.",
    includeTitle: "Ekleyin",
    nextTitle: "Formdaki sonraki adımlar",
    fallbackQuestion: "Lütfen neyin çalışmadığını, ne gözlemlediğinizi ve hangi mutfak bölümünün etkilendiğini yazın.",
    itemStarted: "Sorunun ne zaman başladığı ve sürekli mi yoksa aralıklı mı olduğu.",
    itemVisibleDamage: "Gözle görülür hasar, gevşeklik, sızıntı, tıkanıklık veya tepki vermeme durumu.",
    itemPhotoSet: "Etkilenen alanın bir genel fotoğrafı ve bir yakın plan fotoğrafı.",
    itemErrorCode: "Bir cihaz söz konusuysa ekrandaki mesaj, yanıp sönme veya hata kodu.",
    itemNoiseSmell: "Olağandışı ses, koku, ısı veya titreşim olup olmadığı.",
    itemLeak: "Suyun nerede göründüğü, sadece kullanım sırasında mı yoksa beklerken de mi olduğu ve ne kadar su olduğu.",
    itemDishwasher: "Bulaşık makinesinin başlamadığını, su boşaltmadığını, sızdırdığını veya hata verdiğini belirtin.",
    itemWashingMachine: "Çamaşır makinesinin sıkmadığını, boşaltmadığını, su sızdırdığını veya program sırasında durduğunu belirtin.",
    itemOvenHob: "Fırın mı ocak mı etkilendi, hangi bölge çalışmıyor ve sigorta atmış mı belirtin.",
    itemFridge: "Sorunun soğutma, buzlanma, su, ses veya kapı contası ile ilgili olup olmadığını belirtin.",
    itemHood: "Sorunun fan, çekiş gücü, aydınlatma veya ses seviyesi ile ilgili olup olmadığını belirtin.",
    itemSink: "Sorunun sızıntı, tıkanıklık, kötü koku veya hasarlı armatür olup olmadığını açıklayın.",
    itemCabinet: "Sorunun menteşe, ray, kapak hizası, çizik, çatlak veya eksik bağlantı elemanı olup olmadığını açıklayın.",
    nextMissingContract: "Ekibin mutfak kurulumunu tanıyabilmesi için önce sözleşme numarasını ekleyin.",
    nextMissingArea: "Mümkünse doğru yönlendirme için etkilenen mutfak alanını seçin.",
    nextMissingSerial: "Elektrikli cihaz varsa seri numarasını ekleyin.",
    nextMissingSerialImage: "Mümkünse seri numarası etiketinin fotoğrafını yükleyin.",
    nextMissingAttachments: "Sorun görünür ya da fiziksel ise en az bir fotoğraf ekleyin.",
    nextMissingAvailability: "Teknisyen ziyareti gerekebileceği için uygunluk bilgisi ekleyin.",
    nextMissingContact: "Ekibin size ulaşabilmesi için en az bir iletişim bilgisi bırakın.",
    nextAttachmentReady: "Zaten ek dosya eklediniz, yazılı açıklamayı kısa ve net tutun.",
    askFollowUp: "İsterseniz bir sonraki adımda son problem açıklaması için örnek metin hazırlayabilirim.",
    briefPrompt: "Lütfen neyin bozuk olduğunu, hangi mutfak bölümünün etkilendiğini ve neleri fark ettiğinizi kısaca yazın.",
    briefPromptWithArea: "Lütfen {label} ile ilgili sorunu ve neleri fark ettiğinizi kısaca yazın.",
    sampleWordingIntro: "Şu ifadeyi kullanabilirsiniz:",
    sampleWordingAreaFallback: "etkilenen alan",
    sampleWordingAreaLabel: "Etkilenen alan",
    sampleWordingFallback:
      "Sorun [zaman] tarihinde başladı. [Sürekli/aralıklı] olarak görülüyor. Etkilenen alan [alan]. Gördüğüm durum [gözlem]. Lütfen kontrol edip sonraki adımı paylaşın.",
    sampleWordingOutro: "Lütfen kontrol edip sonraki adımı paylaşın.",
    knowledgeOpening: "Bu sorun için Amica bulaşık makinesiyle ilgili uygun sorun giderme bilgisi buldum.",
    knowledgeOpeningArea: "{label} için Amica bulaşık makinesiyle ilgili uygun sorun giderme bilgisi buldum.",
    knowledgeCodeTitle: "Eşleşen bilgi",
    knowledgeSymptomsTitle: "Genelde anlamı",
    knowledgeChecksTitle: "Önce kontrol edin",
    knowledgeCausesTitle: "Olası neden",
    knowledgeActionsTitle: "Hemen yapılacaklar",
    knowledgeGeneralCode: "Kod",
  },
  es: {
    greetingReply: "Hola. Puedo ayudarte con la reclamación.",
    greetingFollowUp: "Cuéntame qué ocurre o pregunta por el texto, las fotos o la zona correcta de la cocina.",
    greetingExamples:
      "Por ejemplo: \"El fregadero pierde agua\", \"¿Qué fotos debo adjuntar?\" o \"¿Qué zona debo seleccionar?\"",
    unavailable: "La ayuda de reclamaciones no pudo responder a eso ahora mismo.",
    openingGeneral: "Esta es la forma más rápida de aclarar la reclamación para el servicio técnico.",
    openingArea: "Para {label}, esto es lo que el servicio técnico suele necesitar primero.",
    includeTitle: "Incluye",
    nextTitle: "Siguientes pasos sugeridos en el formulario",
    fallbackQuestion: "Indica qué no funciona, qué has observado y qué parte de la cocina está afectada.",
    itemStarted: "Cuándo empezó el problema y si es constante o intermitente.",
    itemVisibleDamage: "Qué está visiblemente dañado, suelto, con fugas, bloqueado o sin reacción.",
    itemPhotoSet: "Una foto general y una foto de detalle de la zona afectada.",
    itemErrorCode: "Cualquier mensaje en pantalla, luz intermitente o código de error si hay un aparato implicado.",
    itemNoiseSmell: "Si hay ruido, olor, calor o vibración inusuales.",
    itemLeak: "Dónde aparece el agua, si ocurre solo durante el uso o también en reposo y cuánta agua hay.",
    itemDishwasher: "Indica si el lavavajillas no arranca, no desagua, pierde agua o muestra un error.",
    itemWashingMachine: "Indica si la lavadora no centrifuga, no desagua, pierde agua o se detiene durante el programa.",
    itemOvenHob: "Indica si está afectado el horno o la placa, qué zona falla y si saltó algún fusible.",
    itemFridge: "Indica si el problema es de refrigeración, hielo, agua, ruido o junta de la puerta.",
    itemHood: "Indica si el problema es el ventilador, la extracción, la iluminación o el nivel de ruido.",
    itemSink: "Describe si el problema es una fuga, un atasco, mal olor o un grifo dañado.",
    itemCabinet: "Describe si el problema afecta a una bisagra, guía, alineación del frente, arañazo, grieta o herraje faltante.",
    nextMissingContract: "Añade primero el número de contrato para que el equipo pueda identificar la cocina.",
    nextMissingArea: "Si es posible, selecciona la zona afectada de la cocina para facilitar la gestión.",
    nextMissingSerial: "Añade el número de serie si hay un aparato eléctrico implicado.",
    nextMissingSerialImage: "Sube una foto de la placa del número de serie si la tienes.",
    nextMissingAttachments: "Adjunta al menos una foto si el problema es visible o físico.",
    nextMissingAvailability: "Añade disponibilidad por si se necesita una visita técnica.",
    nextMissingContact: "Deja al menos una forma de contacto para que el equipo pueda localizarte.",
    nextAttachmentReady: "Ya has añadido archivos, así que mantén la descripción escrita breve y precisa.",
    askFollowUp: "Si quieres, después puedo redactarte un texto modelo para la descripción final del problema.",
    briefPrompt: "Indica brevemente qué falla, qué zona de la cocina está afectada y qué has observado.",
    briefPromptWithArea: "Indica brevemente qué falla en {label} y qué has observado.",
    sampleWordingIntro: "Puedes usar este texto:",
    sampleWordingAreaFallback: "la zona afectada",
    sampleWordingAreaLabel: "Zona afectada",
    sampleWordingFallback:
      "El problema empezó [cuándo]. Es [constante/intermitente]. La zona afectada es [area]. He observado [incidencia visible]. Por favor, revisen el caso e indíquenme el siguiente paso.",
    sampleWordingOutro: "Por favor, revisen el caso e indíquenme el siguiente paso.",
    knowledgeOpening: "He encontrado información de solución de problemas de lavavajillas Amica que coincide con este caso.",
    knowledgeOpeningArea: "Para {label}, he encontrado información de solución de problemas de lavavajillas Amica.",
    knowledgeCodeTitle: "Guía coincidente",
    knowledgeSymptomsTitle: "Normalmente significa",
    knowledgeChecksTitle: "Comprueba primero",
    knowledgeCausesTitle: "Posible causa",
    knowledgeActionsTitle: "Medidas inmediatas",
    knowledgeGeneralCode: "Código",
  },
  fr: {
    greetingReply: "Bonjour. Je peux vous aider avec la réclamation.",
    greetingFollowUp: "Dites-moi ce qui ne fonctionne pas ou posez une question sur le texte, les photos ou la bonne zone de la cuisine.",
    greetingExamples:
      "Par exemple : \"L'évier fuit\", \"Quelles photos dois-je joindre ?\" ou \"Quelle zone dois-je sélectionner ?\"",
    unavailable: "L'assistant réclamation ne peut pas répondre à cela pour le moment.",
    openingGeneral: "Voici la façon la plus rapide de clarifier la réclamation pour le service.",
    openingArea: "Pour {label}, voici ce dont le service a généralement besoin en premier.",
    includeTitle: "À indiquer",
    nextTitle: "Étapes suivantes conseillées dans le formulaire",
    fallbackQuestion: "Indiquez ce qui ne fonctionne pas, ce que vous avez déjà observé et quelle partie de la cuisine est concernée.",
    itemStarted: "Depuis quand le problème existe et s'il est permanent ou intermittent.",
    itemVisibleDamage: "Ce qui est visiblement endommagé, desserré, en fuite, bloqué ou sans réaction.",
    itemPhotoSet: "Une photo d'ensemble et une photo rapprochée de la zone concernée.",
    itemErrorCode: "Tout message à l'écran, voyant clignotant ou code erreur si un appareil est concerné.",
    itemNoiseSmell: "S'il y a un bruit, une odeur, une chaleur ou des vibrations inhabituels.",
    itemLeak: "Où l'eau apparaît, si cela arrive seulement pendant l'utilisation ou aussi à l'arrêt, et quelle quantité d'eau est présente.",
    itemDishwasher: "Précisez si le lave-vaisselle ne démarre pas, ne vidange pas, fuit ou affiche une erreur.",
    itemWashingMachine: "Précisez si le lave-linge n'essore pas, ne vidange pas, fuit ou s'arrête pendant le programme.",
    itemOvenHob: "Indiquez si le four ou la plaque est concerné, quelle zone chauffe mal et si un fusible a sauté.",
    itemFridge: "Précisez si le problème concerne le froid, le givre, l'eau, le bruit ou le joint de porte.",
    itemHood: "Précisez si le problème concerne le ventilateur, l'aspiration, l'éclairage ou le niveau sonore.",
    itemSink: "Décrivez s'il s'agit d'une fuite, d'un bouchon, d'une mauvaise odeur ou d'un robinet endommagé.",
    itemCabinet: "Décrivez si le problème concerne une charnière, une coulisse, l'alignement de façade, une rayure, une fissure ou une ferrure manquante.",
    nextMissingContract: "Ajoutez d'abord le numéro de contrat pour que l'équipe puisse identifier la cuisine.",
    nextMissingArea: "Sélectionnez si possible la zone de cuisine concernée pour faciliter l'orientation du dossier.",
    nextMissingSerial: "Ajoutez le numéro de série si un appareil électrique est concerné.",
    nextMissingSerialImage: "Téléchargez si possible une photo de l'étiquette du numéro de série.",
    nextMissingAttachments: "Ajoutez au moins une photo si le problème est visible ou matériel.",
    nextMissingAvailability: "Ajoutez vos disponibilités si une visite technique peut être nécessaire.",
    nextMissingContact: "Laissez au moins un moyen de contact pour que l'équipe puisse vous joindre.",
    nextAttachmentReady: "Vous avez déjà ajouté des pièces jointes, gardez maintenant la description écrite courte et précise.",
    askFollowUp: "Si vous voulez, je peux ensuite rédiger un texte type pour la description finale du problème.",
    briefPrompt: "Indiquez brièvement ce qui ne fonctionne pas, quelle zone de la cuisine est concernée et ce que vous avez observé.",
    briefPromptWithArea: "Indiquez brièvement ce qui ne fonctionne pas sur {label} et ce que vous avez observé.",
    sampleWordingIntro: "Vous pouvez utiliser cette formulation :",
    sampleWordingAreaFallback: "la zone concernée",
    sampleWordingAreaLabel: "Zone concernée",
    sampleWordingFallback:
      "Le problème a commencé [quand]. Il est [constant/intermittent]. La zone concernée est [area]. J'ai constaté [observation visible]. Merci de vérifier le dossier et de m'indiquer la suite.",
    sampleWordingOutro: "Merci de vérifier le dossier et de m'indiquer la suite.",
    knowledgeOpening: "J'ai trouvé des informations de dépannage Amica pour lave-vaisselle qui correspondent à ce problème.",
    knowledgeOpeningArea: "Pour {label}, j'ai trouvé des informations de dépannage Amica pour lave-vaisselle.",
    knowledgeCodeTitle: "Guide correspondant",
    knowledgeSymptomsTitle: "Cela signifie généralement",
    knowledgeChecksTitle: "À vérifier d'abord",
    knowledgeCausesTitle: "Cause possible",
    knowledgeActionsTitle: "Mesures immédiates",
    knowledgeGeneralCode: "Code",
  },
  ru: {
    greetingReply: "Здравствуйте. Я могу помочь с рекламацией.",
    greetingFollowUp: "Опишите, что не работает, или задайте вопрос по формулировке, фотографиям или нужной зоне кухни.",
    greetingExamples:
      "Например: \"Мойка протекает\", \"Какие фото приложить?\" или \"Какую зону выбрать?\"",
    unavailable: "Помощник по рекламациям сейчас не смог ответить на это.",
    openingGeneral: "Вот самый быстрый способ сделать рекламацию понятнее для сервиса.",
    openingArea: "Для {label} сервису обычно сначала нужна такая информация.",
    includeTitle: "Укажите",
    nextTitle: "Рекомендуемые следующие шаги в форме",
    fallbackQuestion: "Опишите, что именно не работает, что вы уже заметили и какая часть кухни затронута.",
    itemStarted: "Когда началась проблема и постоянная она или периодическая.",
    itemVisibleDamage: "Что именно видно: повреждение, люфт, протечка, засор или отсутствие реакции.",
    itemPhotoSet: "Одно общее фото и одно крупное фото затронутой зоны.",
    itemErrorCode: "Любое сообщение на дисплее, мигание или код ошибки, если затронут электроприбор.",
    itemNoiseSmell: "Есть ли необычный шум, запах, нагрев или вибрация.",
    itemLeak: "Где появляется вода, только во время работы или также в покое, и сколько воды видно.",
    itemDishwasher: "Укажите, что посудомоечная машина не запускается, не сливает воду, протекает или показывает ошибку.",
    itemWashingMachine: "Укажите, что стиральная машина не отжимает, не сливает воду, протекает или останавливается во время программы.",
    itemOvenHob: "Укажите, затронута духовка или варочная панель, какая зона не работает и выбивало ли предохранитель.",
    itemFridge: "Укажите, касается ли проблема охлаждения, наледи, воды, шума или уплотнителя двери.",
    itemHood: "Укажите, касается ли проблема вентилятора, тяги, подсветки или уровня шума.",
    itemSink: "Опишите, это протечка, засор, неприятный запах или поврежденный смеситель.",
    itemCabinet: "Опишите, касается ли проблема петли, направляющей, выравнивания фасада, царапины, трещины или отсутствующей фурнитуры.",
    nextMissingContract: "Сначала добавьте номер договора, чтобы команда могла определить конфигурацию кухни.",
    nextMissingArea: "Если возможно, выберите затронутую зону кухни, чтобы упростить маршрутизацию заявки.",
    nextMissingSerial: "Добавьте серийный номер, если затронут электроприбор.",
    nextMissingSerialImage: "По возможности загрузите фото таблички с серийным номером.",
    nextMissingAttachments: "Добавьте хотя бы одно фото, если проблема видимая или физическая.",
    nextMissingAvailability: "Добавьте время доступности, если может потребоваться визит техника.",
    nextMissingContact: "Оставьте хотя бы один способ связи, чтобы сервис мог с вами связаться.",
    nextAttachmentReady: "Вы уже добавили вложения, поэтому держите письменное описание коротким и точным.",
    askFollowUp: "Если хотите, следующим сообщением я подготовлю пример текста для итогового описания проблемы.",
    briefPrompt: "Кратко опишите, что не работает, какая зона кухни затронута и что вы уже заметили.",
    briefPromptWithArea: "Кратко опишите, что не работает в зоне {label}, и что вы уже заметили.",
    sampleWordingIntro: "Можно использовать такую формулировку:",
    sampleWordingAreaFallback: "затронутая зона",
    sampleWordingAreaLabel: "Затронутая зона",
    sampleWordingFallback:
      "Проблема появилась [когда]. Она [постоянная/периодическая]. Затронута [area]. Я заметил(а) [видимое наблюдение]. Пожалуйста, проверьте случай и сообщите следующий шаг.",
    sampleWordingOutro: "Пожалуйста, проверьте случай и сообщите следующий шаг.",
    knowledgeOpening: "Я нашел подходящую информацию по неисправностям посудомоечных машин Amica для этого случая.",
    knowledgeOpeningArea: "Для {label} я нашел подходящую информацию по неисправностям посудомоечных машин Amica.",
    knowledgeCodeTitle: "Подходящая инструкция",
    knowledgeSymptomsTitle: "Обычно это означает",
    knowledgeChecksTitle: "Сначала проверьте",
    knowledgeCausesTitle: "Возможная причина",
    knowledgeActionsTitle: "Срочные действия",
    knowledgeGeneralCode: "Код",
  },
};

const KNOWLEDGE_TEXT = {
  en: {
    titles: {
      water_inlet: "Water inlet",
      heating_temperature: "Heating / temperature",
      leak_overflow: "Leak / overflow",
      drainage: "Drainage",
      reset_device: "Reset the appliance",
      clean_filters: "Clean the filters",
      check_base_tray: "Check the base tray",
    },
    details: {
      water_inlet_error: "The dishwasher reports a water inlet problem.",
      target_temperature_not_reached: "The required temperature is not being reached.",
      water_in_base_tray: "There is water in the base tray.",
      continuous_pumping: "The appliance may keep pumping continuously.",
      beeping_alarm: "The appliance may beep during the fault.",
      water_not_draining: "The water is not draining out.",
      check_water_tap: "Check whether the water tap is open and supplying water.",
      check_inlet_hose_kinks: "Check the inlet hose for kinks.",
      clean_hose_connection_filter: "Clean the filter screen at the hose connection.",
      clean_filters: "Clean the internal filters.",
      check_drain_hose: "Check the drain hose for blockages or kinks.",
      check_pump_blockage: "Check the pump area for blockages.",
      heater_may_be_defective: "A defective heating element may be the cause.",
      temperature_sensor_may_be_defective: "A defective temperature sensor may be the cause.",
      appliance_leak: "A leak in the appliance is the most likely cause.",
      hose_to_sump_connection_leak: "A leaking hose connection to the sump is a known possible cause.",
      report_error_code_e1: "Mention the E1 code in the claim.",
      report_error_code_e3: "Mention the E3 code in the claim.",
      report_error_code_e02: "Mention the E02 code in the claim.",
      check_base_tray_for_water: "If the unit keeps pumping even after power-off, check whether there is water in the base tray.",
      unplug_one_to_two_minutes: "Unplug the appliance for about 1 to 2 minutes to reset the electronics.",
      inspect_inner_filters_for_dirt: "Inspect the inside filters for dirt and buildup.",
      tilt_forward_to_drain_base_tray_water:
        "If it keeps pumping and there is water in the base tray, tilt the appliance slightly forward so the water can run out.",
    },
  },
  de: {
    titles: {
      water_inlet: "Wasserzulauf",
      heating_temperature: "Temperatur / Heizung",
      leak_overflow: "Undichtigkeit / Überlauf",
      drainage: "Wasserablauf",
      reset_device: "Gerät zurücksetzen",
      clean_filters: "Siebe reinigen",
      check_base_tray: "Bodenwanne prüfen",
    },
    details: {
      water_inlet_error: "Der Geschirrspüler meldet ein Problem beim Wasserzulauf.",
      target_temperature_not_reached: "Die erforderliche Temperatur wird nicht erreicht.",
      water_in_base_tray: "Es befindet sich Wasser in der Bodenwanne.",
      continuous_pumping: "Das Gerät kann dauerhaft weiterpumpen.",
      beeping_alarm: "Während des Fehlers kann das Gerät piepen.",
      water_not_draining: "Das Wasser wird nicht abgepumpt.",
      check_water_tap: "Prüfen, ob der Wasserhahn geöffnet ist und Wasser liefert.",
      check_inlet_hose_kinks: "Den Zulaufschlauch auf Knicke prüfen.",
      clean_hose_connection_filter: "Das Sieb im Schlauchanschluss reinigen.",
      clean_filters: "Die Innensiebe reinigen.",
      check_drain_hose: "Den Ablaufschlauch auf Verstopfungen oder Knicke prüfen.",
      check_pump_blockage: "Die Pumpe auf Verstopfungen prüfen.",
      heater_may_be_defective: "Mögliche Ursache ist ein defektes Heizelement.",
      temperature_sensor_may_be_defective: "Mögliche Ursache ist ein defekter Temperatursensor.",
      appliance_leak: "Am wahrscheinlichsten ist eine Undichtigkeit im Gerät.",
      hose_to_sump_connection_leak: "Eine mögliche bekannte Ursache ist ein undichter Verbindungsschlauch zum Pumpentopf.",
      report_error_code_e1: "Den Fehlercode E1 in der Reklamation angeben.",
      report_error_code_e3: "Den Fehlercode E3 in der Reklamation angeben.",
      report_error_code_e02: "Den Fehlercode E02 in der Reklamation angeben.",
      check_base_tray_for_water: "Wenn das Gerät auch nach dem Ausschalten weiterpumpt, prüfen, ob sich Wasser in der Bodenwanne befindet.",
      unplug_one_to_two_minutes: "Zum Reset den Stecker für etwa 1 bis 2 Minuten ziehen.",
      inspect_inner_filters_for_dirt: "Die Siebe im Innenraum auf Verschmutzungen prüfen.",
      tilt_forward_to_drain_base_tray_water:
        "Wenn das Gerät weiterpumpt und Wasser in der Bodenwanne steht, das Gerät leicht nach vorne kippen, damit das Wasser ablaufen kann.",
    },
  },
  tr: {
    titles: {
      water_inlet: "Su girişi",
      heating_temperature: "Isıtma / sıcaklık",
      leak_overflow: "Sızıntı / taşma",
      drainage: "Su tahliyesi",
      reset_device: "Cihazı sıfırlayın",
      clean_filters: "Filtreleri temizleyin",
      check_base_tray: "Alt hazneyi kontrol edin",
    },
    details: {
      water_inlet_error: "Bulaşık makinesi su giriş hatası bildiriyor.",
      target_temperature_not_reached: "Gerekli sıcaklığa ulaşılamıyor.",
      water_in_base_tray: "Alt haznede su bulunuyor.",
      continuous_pumping: "Cihaz sürekli pompalamaya devam edebilir.",
      beeping_alarm: "Arıza sırasında bip sesi duyulabilir.",
      water_not_draining: "Su boşaltılmıyor.",
      check_water_tap: "Su musluğunun açık olduğunu ve su verdiğini kontrol edin.",
      check_inlet_hose_kinks: "Su giriş hortumunda kıvrılma olup olmadığını kontrol edin.",
      clean_hose_connection_filter: "Hortum bağlantısındaki filtreyi temizleyin.",
      clean_filters: "İç filtreleri temizleyin.",
      check_drain_hose: "Tahliye hortumunda tıkanıklık veya kıvrılma olup olmadığını kontrol edin.",
      check_pump_blockage: "Pompayı tıkanıklık açısından kontrol edin.",
      heater_may_be_defective: "Nedeni arızalı bir ısıtıcı eleman olabilir.",
      temperature_sensor_may_be_defective: "Nedeni arızalı bir sıcaklık sensörü olabilir.",
      appliance_leak: "En olası neden cihaz içindeki bir sızıntıdır.",
      hose_to_sump_connection_leak: "Sump bağlantı hortumundaki kaçak bilinen olası bir nedendir.",
      report_error_code_e1: "Şikayette E1 hata kodunu belirtin.",
      report_error_code_e3: "Şikayette E3 hata kodunu belirtin.",
      report_error_code_e02: "Şikayette E02 hata kodunu belirtin.",
      check_base_tray_for_water: "Cihaz kapatıldıktan sonra bile pompalamaya devam ediyorsa alt haznede su olup olmadığını kontrol edin.",
      unplug_one_to_two_minutes: "Elektroniği sıfırlamak için cihazın fişini yaklaşık 1 ila 2 dakika çekin.",
      inspect_inner_filters_for_dirt: "İç filtreleri kir ve birikme açısından kontrol edin.",
      tilt_forward_to_drain_base_tray_water:
        "Pompalamaya devam ediyor ve alt haznede su varsa suyun boşalması için cihazı hafifçe öne doğru eğin.",
    },
  },
  es: {
    titles: {
      water_inlet: "Entrada de agua",
      heating_temperature: "Calentamiento / temperatura",
      leak_overflow: "Fuga / desbordamiento",
      drainage: "Desagüe",
      reset_device: "Reiniciar el aparato",
      clean_filters: "Limpiar los filtros",
      check_base_tray: "Comprobar la bandeja inferior",
    },
    details: {
      water_inlet_error: "El lavavajillas indica un problema de entrada de agua.",
      target_temperature_not_reached: "No se alcanza la temperatura necesaria.",
      water_in_base_tray: "Hay agua en la bandeja inferior.",
      continuous_pumping: "El aparato puede seguir bombeando continuamente.",
      beeping_alarm: "Durante el fallo puede emitir pitidos.",
      water_not_draining: "El agua no se está evacuando.",
      check_water_tap: "Comprueba que el grifo de agua esté abierto y suministre agua.",
      check_inlet_hose_kinks: "Comprueba si la manguera de entrada está doblada.",
      clean_hose_connection_filter: "Limpia el filtro de la conexión de la manguera.",
      clean_filters: "Limpia los filtros interiores.",
      check_drain_hose: "Comprueba si la manguera de desagüe tiene atascos o dobleces.",
      check_pump_blockage: "Comprueba si la bomba está bloqueada.",
      heater_may_be_defective: "La causa puede ser una resistencia defectuosa.",
      temperature_sensor_may_be_defective: "La causa puede ser un sensor de temperatura defectuoso.",
      appliance_leak: "La causa más probable es una fuga dentro del aparato.",
      hose_to_sump_connection_leak: "Una posible causa conocida es una fuga en la conexión de la manguera al sumidero.",
      report_error_code_e1: "Indica el código E1 en la reclamación.",
      report_error_code_e3: "Indica el código E3 en la reclamación.",
      report_error_code_e02: "Indica el código E02 en la reclamación.",
      check_base_tray_for_water: "Si el equipo sigue bombeando incluso apagado, comprueba si hay agua en la bandeja inferior.",
      unplug_one_to_two_minutes: "Desenchufa el aparato durante unos 1 a 2 minutos para reiniciar la electrónica.",
      inspect_inner_filters_for_dirt: "Revisa los filtros interiores por si hay suciedad acumulada.",
      tilt_forward_to_drain_base_tray_water:
        "Si sigue bombeando y hay agua en la bandeja inferior, inclina ligeramente el aparato hacia delante para que el agua salga.",
    },
  },
  fr: {
    titles: {
      water_inlet: "Arrivée d'eau",
      heating_temperature: "Chauffage / température",
      leak_overflow: "Fuite / débordement",
      drainage: "Vidange",
      reset_device: "Réinitialiser l'appareil",
      clean_filters: "Nettoyer les filtres",
      check_base_tray: "Vérifier le bac inférieur",
    },
    details: {
      water_inlet_error: "Le lave-vaisselle signale un problème d'arrivée d'eau.",
      target_temperature_not_reached: "La température nécessaire n'est pas atteinte.",
      water_in_base_tray: "Il y a de l'eau dans le bac inférieur.",
      continuous_pumping: "L'appareil peut continuer à pomper en permanence.",
      beeping_alarm: "L'appareil peut émettre des bips pendant le défaut.",
      water_not_draining: "L'eau n'est pas évacuée.",
      check_water_tap: "Vérifiez que le robinet d'eau est ouvert et alimente bien l'appareil.",
      check_inlet_hose_kinks: "Vérifiez que le tuyau d'arrivée d'eau n'est pas pincé.",
      clean_hose_connection_filter: "Nettoyez le filtre au raccord du tuyau.",
      clean_filters: "Nettoyez les filtres internes.",
      check_drain_hose: "Vérifiez que le tuyau de vidange n'est pas bouché ou plié.",
      check_pump_blockage: "Vérifiez si la pompe est obstruée.",
      heater_may_be_defective: "La cause peut être une résistance défectueuse.",
      temperature_sensor_may_be_defective: "La cause peut être une sonde de température défectueuse.",
      appliance_leak: "La cause la plus probable est une fuite dans l'appareil.",
      hose_to_sump_connection_leak: "Une cause possible connue est une fuite au raccord du tuyau vers le puisard.",
      report_error_code_e1: "Mentionnez le code E1 dans la réclamation.",
      report_error_code_e3: "Mentionnez le code E3 dans la réclamation.",
      report_error_code_e02: "Mentionnez le code E02 dans la réclamation.",
      check_base_tray_for_water: "Si l'appareil continue à pomper même éteint, vérifiez s'il y a de l'eau dans le bac inférieur.",
      unplug_one_to_two_minutes: "Débranchez l'appareil pendant environ 1 à 2 minutes pour réinitialiser l'électronique.",
      inspect_inner_filters_for_dirt: "Contrôlez l'encrassement des filtres internes.",
      tilt_forward_to_drain_base_tray_water:
        "S'il continue à pomper et qu'il y a de l'eau dans le bac inférieur, inclinez légèrement l'appareil vers l'avant pour évacuer l'eau.",
    },
  },
  ru: {
    titles: {
      water_inlet: "Подача воды",
      heating_temperature: "Нагрев / температура",
      leak_overflow: "Протечка / перелив",
      drainage: "Слив воды",
      reset_device: "Сбросить устройство",
      clean_filters: "Очистить фильтры",
      check_base_tray: "Проверить нижний поддон",
    },
    details: {
      water_inlet_error: "Посудомоечная машина сообщает о проблеме с подачей воды.",
      target_temperature_not_reached: "Не достигается требуемая температура.",
      water_in_base_tray: "В нижнем поддоне есть вода.",
      continuous_pumping: "Устройство может постоянно откачивать воду.",
      beeping_alarm: "Во время ошибки устройство может подавать звуковой сигнал.",
      water_not_draining: "Вода не сливается.",
      check_water_tap: "Проверьте, открыт ли кран подачи воды и есть ли подача воды.",
      check_inlet_hose_kinks: "Проверьте, нет ли перегибов на заливном шланге.",
      clean_hose_connection_filter: "Очистите фильтр в месте подключения шланга.",
      clean_filters: "Очистите внутренние фильтры.",
      check_drain_hose: "Проверьте сливной шланг на засоры и перегибы.",
      check_pump_blockage: "Проверьте насос на засоры.",
      heater_may_be_defective: "Причиной может быть неисправный нагревательный элемент.",
      temperature_sensor_may_be_defective: "Причиной может быть неисправный датчик температуры.",
      appliance_leak: "Наиболее вероятная причина - протечка внутри устройства.",
      hose_to_sump_connection_leak: "Известная возможная причина - протечка соединительного шланга к поддону.",
      report_error_code_e1: "Укажите код ошибки E1 в рекламации.",
      report_error_code_e3: "Укажите код ошибки E3 в рекламации.",
      report_error_code_e02: "Укажите код ошибки E02 в рекламации.",
      check_base_tray_for_water: "Если устройство продолжает качать даже после выключения, проверьте, есть ли вода в нижнем поддоне.",
      unplug_one_to_two_minutes: "Отключите устройство от сети примерно на 1-2 минуты, чтобы сбросить электронику.",
      inspect_inner_filters_for_dirt: "Проверьте внутренние фильтры на загрязнение.",
      tilt_forward_to_drain_base_tray_water:
        "Если насос продолжает работать и в нижнем поддоне есть вода, слегка наклоните устройство вперед, чтобы вода вытекла.",
    },
  },
};

function t(language) {
  return COPY[language] || COPY.en;
}

function copyText(copy, key) {
  return copy[key] || COPY.en[key] || "";
}

function knowledgeText(language) {
  return KNOWLEDGE_TEXT[language] || KNOWLEDGE_TEXT.en;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeConversationMessages(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((message) => ({
      role: normalizeText(message?.role).toLowerCase(),
      text: normalizeText(message?.text),
    }))
    .filter((message) => message.text);
}

function normalizeLanguage(value) {
  const language = normalizeText(value).toLowerCase();
  return COPY[language] ? language : "en";
}

function hasDishwasherKeyword(text) {
  const normalized = normalizeLanguageHintText(text);
  return /\bdishwasher\b|\bgeschirrspuler\b|\bgeschirrspulmaschine\b|\bspulmaschine\b|\bspulmachine\b|\bspulmaschiene\b|\bschpulmachine\b|\bschpulmaschine\b/.test(
    normalized,
  );
}

function normalizeLanguageHintText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectExplicitLanguageSwitch(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return null;
  if (/\b(deutsch|deutch|german)\b/.test(normalized)) return "de";
  if (/\b(english|englisch)\b/.test(normalized)) return "en";
  return null;
}

function detectLikelyGerman(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return false;

  const strongGermanTerms = [
    "geschirrspuler",
    "fehlercode",
    "bodenwanne",
    "wasserzulauf",
    "zieht kein wasser",
    "pumpt nicht ab",
    "pumpt dauerhaft",
    "wasser bleibt kalt",
    "heizt nicht",
    "undicht",
  ];
  if (strongGermanTerms.some((term) => normalized.includes(term))) {
    return true;
  }

  const germanCueCount = (
    normalized.match(/\b(meine|mein|bitte|kannst|kant|du|auf|deutsch|deutch|ist|kapput|kaputt|zieht|wasser|heizt|nicht|bleibt|kalt|fehlercode|wird|angezeigt)\b/g) || []
  ).length;

  return germanCueCount >= 2;
}

function resolveAssistantLanguage({ requestedLanguage, question, conversationMessages }) {
  const userTexts = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .map((message) => message.text);
  const signals = [...userTexts, normalizeText(question)].filter(Boolean);

  let explicitPreference = null;
  for (const text of signals) {
    const detected = detectExplicitLanguageSwitch(text);
    if (detected) explicitPreference = detected;
  }
  if (explicitPreference) return explicitPreference;
  if (requestedLanguage === "de") return "de";
  if (detectLikelyGerman(signals.join("\n"))) return "de";
  return requestedLanguage;
}

function normalizeCode(raw) {
  const compact = normalizeText(raw).replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^E(\d{1,2})$/);
  if (!match) return compact;
  const digits = match[1];
  if (digits.length === 1) return `E${digits}`;
  if (digits.length === 2 && digits.startsWith("0")) return `E0${digits[1]}`;
  return `E${digits}`;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function isGreeting(question) {
  const normalized = normalizeLanguageHintText(question);
  if (!normalized) return false;
  if (/^hal{1,2}o?$/.test(normalized)) return true;
  return [
    "hi",
    "hello",
    "hey",
    "hallo",
    "servus",
    "guten tag",
    "good morning",
    "good afternoon",
    "good evening",
  ].includes(normalized);
}

function isLowInformationQuestion(question) {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return true;
  if (isGreeting(normalized)) return false;
  if (normalized.length <= 8) return true;
  if (normalized.split(/\s+/).length <= 2 && !/[?.!]/.test(normalized) && normalized.length < 18) {
    return true;
  }
  return false;
}

function isSampleWordingRequest(question) {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return false;
  return /\b(sample|wording|phrase|write|beschreibung|formul|text)\b/.test(normalized);
}

function isClaimFormHelpRequest(question) {
  const normalized = normalizeLanguageHintText(question);
  if (!normalized) return false;
  return /\b(show claim form help|claim form help|formularhilfe anzeigen|formularhilfe|what should i write|what do i write|what should i put|was soll ich schreiben|welche formulierung|formulierung fur das formular|formulierung fuer das formular|formulierung)\b/.test(
    normalized,
  );
}

function buildSampleWording(copy, claim, focusLabel) {
  const description = normalizeText(claim?.problemDescription);
  const area = focusLabel || copy.sampleWordingAreaFallback;
  if (!description) {
    return `${copy.sampleWordingIntro}\n\n${copy.sampleWordingFallback.replace("[area]", area)}`;
  }

  const sentence = description.endsWith(".") ? description : `${description}.`;
  return `${copy.sampleWordingIntro}\n\n${sentence} ${copy.sampleWordingAreaLabel}: ${area}. ${copy.sampleWordingOutro}`;
}

function detectAreaCategory(area) {
  const haystack = `${normalizeText(area?.name)} ${normalizeText(area?.code)}`.toLowerCase();
  if (!haystack) return "generic";
  if (haystack.includes("dish") || haystack.includes("geschirr") || /sp[uü]lma|spuelma|spulma|schpulma|schpulmachine/.test(haystack)) return "dishwasher";
  if (haystack.includes("wm-") || haystack.includes("washing") || haystack.includes("wasch")) return "washing-machine";
  if (haystack.includes("oven") || haystack.includes("backofen") || haystack.includes("hob") || haystack.includes("koch")) return "oven-hob";
  if (haystack.includes("ref") || haystack.includes("fridge") || haystack.includes("kühl")) return "fridge";
  if (haystack.includes("hood") || haystack.includes("dunst")) return "hood";
  if (haystack.includes("sink") || haystack.includes("spül")) return "sink";
  if (haystack.includes("cab") || haystack.includes("drawer") || haystack.includes("schrank") || haystack.includes("front")) return "cabinet";
  return "generic";
}

function detectTextCategories(text) {
  const haystack = normalizeText(text).toLowerCase();
  const categories = [];
  if (
    /dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaşık|lavavajillas|lave-vaisselle|посудомо/i.test(haystack)
    || hasDishwasherKeyword(text)
  ) {
    categories.push("dishwasher");
  }
  if (/washing machine|waschmaschine|lavadora|стиральн/i.test(haystack)) {
    categories.push("washing-machine");
  }
  if (/fridge|refrigerator|kühlschrank|réfrig|холодиль/i.test(haystack)) {
    categories.push("fridge");
  }
  return categories;
}

function isApplianceCategory(category) {
  return ["dishwasher", "washing-machine", "oven-hob", "fridge", "hood"].includes(category);
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function extractErrorCodes(text) {
  const matches = [];
  const pattern = /(^|[^A-Z0-9])(E\s*0?\d{1,2})(?=$|[^A-Z0-9])/gi;
  let match = pattern.exec(text);
  while (match) {
    matches.push(normalizeCode(match[2]));
    match = pattern.exec(text);
  }
  return dedupe(matches);
}

function inferDishwasherCodesFromSymptoms(text) {
  const haystack = normalizeText(text).toLowerCase();
  const codes = [];

  if (/\btemperature\b|\bheating\b|water stays cold|not heating|does not heat|cold water|heizt nicht|wasser bleibt kalt/.test(haystack)) {
    codes.push("E3");
  }
  if (/\bnot taking in water\b|does not take in water|no water intake|water inlet|wasserzulauf|zulauf|not filling|zieht kein wasser/.test(haystack)) {
    codes.push("E1");
  }
  if (/\bnot draining\b|does not drain|drainage|drain problem|wasserablauf|ablauf|not pumping out|pumpt nicht ab/.test(haystack)) {
    codes.push("E02");
  }
  if (/\bleak\b|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray|undicht|wasser in der bodenwanne/.test(haystack)) {
    codes.push("E4");
  }

  return dedupe(codes);
}

function getConversationUserText(conversationMessages) {
  return normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.text)
    .join("\n")
    .trim();
}

function detectStructuredMenuChoice(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return null;

  if (normalized === "ein gerat funktioniert nicht") return "appliance_choice";
  if (normalized === "es gibt ein leck oder ein wasserproblem") return "leak_choice";
  if (normalized === "spule wasserhahn oder abfluss ist verstopft oder beschadigt") return "drainage_choice";
  if (normalized === "es gibt ein problem mit strom oder beleuchtung") return "electrical_choice";
  if (normalized === "etwas ist kaputt oder beschadigt") return "damage_choice";

  return null;
}

function classifyGeneralIssue({ question, claim, selectedAreas, conversationMessages }) {
  const conversationText = getConversationUserText(conversationMessages);
  const combinedText = `${conversationText}\n${normalizeText(question)}\n${normalizeText(claim?.problemDescription)}`.trim();
  const haystack = combinedText.toLowerCase();
  const structuredChoice = detectStructuredMenuChoice(question);
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  const hasAppliance =
    /oven|backofen|fridge|refrigerator|freezer|washing machine|dryer|hob|cooktop|extractor|hood|appliance/i.test(combinedText)
    || hasDishwasherKeyword(combinedText)
    || areaCategories.some((category) => ["oven-hob", "fridge", "washing-machine", "hood"].includes(category));
  const hasKitchenArea = /kitchen|küche|room|maintenance|broken|help|problem/i.test(combinedText);
  const hasLeak = /\bleak|leaking|water leaking|water under|wet area|pipe leaking|under the sink|undicht|austritt/i.test(haystack);
  const hasDrainage = /\bblocked|clogged|drain|drainage|not draining|slow drain|backing up|ablauf|verstopf/i.test(haystack);
  const hasElectrical = /\belectrical|electricity|light|lighting|lamp|socket|switch|power|fuse|breaker|strom|licht/i.test(haystack);
  const hasDamage = /\bbroken|damaged|scratch|scratched|crack|hinge|drawer|door|window|furniture|cabinet|tap|sink|drain|kaputt|beschadigt|beschädigt/i.test(haystack);

  if (structuredChoice === "appliance_choice") {
    return { subject: "the appliance", type: "appliance_choice", specific: false };
  }
  if (structuredChoice === "leak_choice") {
    return { subject: "the leak", type: "leak", specific: true };
  }
  if (structuredChoice === "drainage_choice") {
    return { subject: "the sink or drain", type: "drainage", specific: true };
  }
  if (structuredChoice === "electrical_choice") {
    return { subject: "the electrical issue", type: "electrical", specific: true };
  }
  if (structuredChoice === "damage_choice") {
    return { subject: "this", type: "damage_choice", specific: false };
  }

  if (hasLeak) {
    return {
      subject: /sink/i.test(haystack) ? "the sink area" : "the leak",
      type: "leak",
      specific: true,
    };
  }
  if (hasDrainage) {
    return {
      subject: /sink|drain|tap/i.test(haystack) ? "the sink or drain" : "the blockage",
      type: "drainage",
      specific: true,
    };
  }
  if (hasElectrical) {
    return {
      subject: /light|lighting|lamp/i.test(haystack) ? "the lighting" : "the electrical issue",
      type: "electrical",
      specific: true,
    };
  }
  if (hasAppliance) {
    return {
      subject: /oven|backofen/i.test(haystack)
        ? "the oven"
        : /fridge|refrigerator|freezer/i.test(haystack)
          ? "the fridge or freezer"
          : /washing machine/i.test(haystack)
            ? "the washing machine"
            : /dryer/i.test(haystack)
              ? "the dryer"
              : /hob|cooktop/i.test(haystack)
                ? "the hob"
                : /extractor|hood/i.test(haystack)
                  ? "the extractor"
                  : "the appliance",
      type: "appliance_vague",
      specific: false,
    };
  }
  if (hasKitchenArea || hasDamage) {
    const isVagueDamage = /etwas ist kaputt|ich habe ein problem|es funktioniert nicht|in der kuche ist etwas kaputt|in der küche ist etwas kaputt/i.test(
      haystack,
    );
    return {
      subject: /kitchen/i.test(haystack) ? "the kitchen" : "this",
      type: hasDamage && !isVagueDamage ? "damage" : "area_vague",
      specific: hasDamage && !isVagueDamage && !/something is broken|problem in the kitchen|need help with maintenance/i.test(haystack),
    };
  }

  return {
    subject: "this",
    type: "generic_vague",
    specific: false,
  };
}

function buildAreaAdvice(copy, categories, combinedText) {
  const items = [];
  items.push(copy.itemStarted, copy.itemVisibleDamage, copy.itemPhotoSet);

  if (/\bleak|water|undicht|nass|tropf|drain|ablauf/i.test(combinedText)) {
    items.push(copy.itemLeak);
  }

  if (/\berror|code|display|blink|anzeige|fault|st.rung/i.test(combinedText)) {
    items.push(copy.itemErrorCode);
  }

  if (/\bnoise|smell|odor|geräusch|laut|vibration|geruch|heiss|hot/i.test(combinedText)) {
    items.push(copy.itemNoiseSmell);
  }

  for (const category of categories) {
    if (category === "dishwasher") items.push(copy.itemDishwasher);
    if (category === "washing-machine") items.push(copy.itemWashingMachine);
    if (category === "oven-hob") items.push(copy.itemOvenHob);
    if (category === "fridge") items.push(copy.itemFridge);
    if (category === "hood") items.push(copy.itemHood);
    if (category === "sink") items.push(copy.itemSink);
    if (category === "cabinet") items.push(copy.itemCabinet);
  }

  return dedupe(items).slice(0, 6);
}

function buildNextSteps(copy, claim, categories, selectedAreas) {
  const steps = [];

  if (!normalizeText(claim.contractNumber)) {
    steps.push(copy.nextMissingContract);
  }
  if (!selectedAreas.length) {
    steps.push(copy.nextMissingArea);
  }
  if (categories.some(isApplianceCategory) && !normalizeText(claim.serialNumber)) {
    steps.push(copy.nextMissingSerial);
  }
  if (categories.some(isApplianceCategory) && !claim.hasSerialNumberImage) {
    steps.push(copy.nextMissingSerialImage);
  }
  if (!claim.attachmentCount) {
    steps.push(copy.nextMissingAttachments);
  } else {
    steps.push(copy.nextAttachmentReady);
  }
  if (!normalizeText(claim.availabilityDate) && !normalizeText(claim.availabilityTime)) {
    steps.push(copy.nextMissingAvailability);
  }
  if (!claim.hasPhone && !claim.hasEmail) {
    steps.push(copy.nextMissingContact);
  }

  return dedupe(steps).slice(0, 5);
}

function formatSection(title, items) {
  if (!items.length) {
    return "";
  }
  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function formatQuotedBlock(title, text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }
  return `${title}\n"${normalized}"`;
}

function getClaimFormHelpClosingSentence(language) {
  return language === "de"
    ? "Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben."
    : "I can also give you wording for the claim form if needed.";
}

function buildClaimFormHelpActions(language) {
  const label = language === "de" ? "Formularhilfe anzeigen" : "Show claim-form help";
  return [{ id: "claim_form_help", label, prompt: label }];
}

function getClaimFormNextStep(language) {
  return language === "de"
    ? "Falls das Problem weiterhin besteht, können Sie eine Reklamation erstellen."
    : "If the issue continues, you can create a claim.";
}

function buildCompactSupportAnswer({ language, intro, stepsTitle, steps }) {
  const answer = [
    intro,
    formatSection(stepsTitle || (language === "de" ? "Sie können Folgendes prüfen" : "You can try"), steps || []),
    getClaimFormNextStep(language),
    getClaimFormHelpClosingSentence(language),
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    answer,
    actions: buildClaimFormHelpActions(language),
  };
}

function normalizeAssistantReturn(value) {
  if (value && typeof value === "object" && typeof value.answer === "string") {
    return value;
  }
  return { answer: String(value ?? "") };
}

function buildClaimFormHelpAnswer({ language, claimGuidance, description }) {
  return [
    formatSection(language === "de" ? "Für das Schadensformular" : "For the claim form", claimGuidance || []),
    formatQuotedBlock(language === "de" ? "Vorschlag für die Beschreibung" : "Suggested problem description", description),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function hasOnlyDishwasherErrorCodeDisplayContext(text) {
  const haystack = normalizeText(text).toLowerCase();
  const mentionsDisplayError = /\berror code\b|shows an error|code on the display|display|anzeige|fehlercode/.test(haystack);
  const hasExplicitCode = extractErrorCodes(haystack).length > 0;
  const hasOtherSpecificSymptom = /\btemperature\b|\bheating\b|water stays cold|not heating|does not heat|cold water|\bnot taking in water\b|does not take in water|no water intake|water inlet|wasserzulauf|zulauf|not filling|\bnot draining\b|does not drain|drainage|drain problem|wasserablauf|ablauf|not pumping out|\bleak\b|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray/.test(
    haystack,
  );

  return mentionsDisplayError && !hasExplicitCode && !hasOtherSpecificSymptom;
}

function buildGenericAnswer({ language, question, context, selectedAreas, claim }) {
  const copy = t(language);
  const focusLabel = normalizeText(context?.label);
  const questionText = normalizeText(question);

  if (isGreeting(questionText)) {
    return `${copy.greetingReply}\n\n${copy.greetingFollowUp}\n\n${copy.greetingExamples}`;
  }

  if (isSampleWordingRequest(questionText)) {
    return buildSampleWording(copy, claim || {}, focusLabel);
  }

  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const scopedAreas =
    context?.type === "area" && focusLabel
      ? selectedAreas.filter((area) => normalizeText(area.name) === focusLabel)
      : selectedAreas;
  const categories = dedupe([...scopedAreas.map(detectAreaCategory), ...detectTextCategories(combinedText)]);

  const opening =
    context?.type === "area" && focusLabel
      ? copy.openingArea.replace("{label}", focusLabel)
      : copy.openingGeneral;

  const includeItems = buildAreaAdvice(copy, categories, combinedText);
  const nextItems = buildNextSteps(copy, claim || {}, categories, scopedAreas);

  const sections = [
    opening,
    formatSection(copy.includeTitle, includeItems),
    formatSection(copy.nextTitle, nextItems),
    copy.askFollowUp,
  ].filter(Boolean);

  if (!questionText || isLowInformationQuestion(questionText)) {
    sections.unshift(
      context?.type === "area" && focusLabel
        ? copy.briefPromptWithArea.replace("{label}", focusLabel)
        : copy.briefPrompt,
    );
  }

  return sections.join("\n\n").trim();
}

function getDishwasherContext({ question, claim, selectedAreas }) {
  const questionText = normalizeText(question);
  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  const categories = dedupe([...areaCategories, ...detectTextCategories(combinedText)]);
  const explicitErrorCodes = extractErrorCodes(combinedText);
  const inferredErrorCodes = inferDishwasherCodesFromSymptoms(combinedText);
  const errorCodes = dedupe([...explicitErrorCodes, ...inferredErrorCodes]);
  const hasDishwasherContext =
    categories.includes("dishwasher")
    || /amica|dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaşık|lavavajillas|lave-vaisselle|посудомо/i.test(combinedText);

  return {
    combinedText,
    categories,
    explicitErrorCodes,
    inferredErrorCodes,
    errorCodes,
    hasDishwasherContext,
  };
}

function enrichDishwasherContextWithConversation(baseContext, conversationMessages) {
  const conversationText = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.text)
    .join("\n")
    .trim();
  const combinedText = `${conversationText}\n${baseContext.combinedText}`.trim();
  const categories = dedupe([...baseContext.categories, ...detectTextCategories(combinedText)]);
  const explicitErrorCodes = dedupe([...baseContext.explicitErrorCodes, ...extractErrorCodes(combinedText)]);
  const inferredErrorCodes = dedupe([...baseContext.inferredErrorCodes, ...inferDishwasherCodesFromSymptoms(combinedText)]);
  const errorCodes = dedupe([...explicitErrorCodes, ...inferredErrorCodes]);
  const hasDishwasherContext =
    baseContext.hasDishwasherContext
    || categories.includes("dishwasher")
    || /amica|dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaÅŸÄ±k|lavavajillas|lave-vaisselle|Ð¿Ð¾ÑÑƒÐ´Ð¾Ð¼Ð¾/i.test(combinedText);

  return {
    combinedText,
    categories,
    explicitErrorCodes,
    inferredErrorCodes,
    errorCodes,
    hasDishwasherContext,
  };
}

function hasLeakOverflowContext(text) {
  return /\bleak|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray|water in base tray|undicht|austritt|wasser in der bodenwanne/i.test(
    text,
  );
}

function hasSpecificDishwasherSymptom(text) {
  return /\be[0-9]{1,2}\b|temperature|heating|cold|water inlet|zulauf|drain|draining|ablauf|pump|pumping|leak|leaking|overflow|base tray|bodenwanne|undicht|display|error code|error|not start|does not start|not heating|water stays cold/i.test(
    text,
  );
}

function getIssueSummaryKeyLegacy(titleKey) {
  if (titleKey === "water_inlet") return "water inlet problem";
  if (titleKey === "heating_temperature") return "heating problem";
  if (titleKey === "leak_overflow") return "leak or overflow problem";
  if (titleKey === "drainage") return "drainage problem";
  return "dishwasher problem";
}

function getWaterInletResponseCopyLegacy(language, code) {
  const normalizedCode = normalizeCode(code || "E1");
  if (language === "tr") {
    return {
      whatItMeans: ["Bulaşık makinesi yeterli su almıyor."],
      actions: [
        "Su musluğunun tamamen açık olduğunu kontrol edin.",
        "Giriş hortumunun bükülmüş veya kıvrılmış olup olmadığını kontrol edin.",
        "Hortum bağlantısındaki küçük filtreyi veya süzgeci temizleyin.",
        "Sıfırlamak için bulaşık makinesinin fişini 1 ila 2 dakika çekin.",
      ],
      claimGuidance: [`Bulaşık makinesinin su almadığını belirtin ve ekranda görünüyorsa ${normalizedCode} hata kodunu ekleyin.`],
      suggestedDescription:
        `Amica bulaşık makinem su almıyor${normalizedCode ? ` ve ${normalizedCode} hata kodu görünebilir` : ""}. Musluğu ve giriş hortumunu kontrol ettim ancak sorun devam ediyor. Lütfen kontrol ayarlayın veya sonraki adımı paylaşın.`,
    };
  }
  return {
    whatItMeans: ["The dishwasher is not getting enough water."],
    actions: [
      "Check that the water tap is fully open.",
      "Check whether the inlet hose is bent or kinked.",
      "Clean the small filter or sieve in the hose connection.",
      "Unplug the dishwasher for 1 to 2 minutes to reset it.",
    ],
    claimGuidance: [`Mention that the dishwasher is not taking in water and add ${normalizedCode} if it appears on the display.`],
    suggestedDescription:
      `My Amica dishwasher is not taking in water${normalizedCode ? ` and may show error code ${normalizedCode}` : ""}. I checked the water tap and inlet hose, but the issue remains. Please arrange a check or advise on the next step.`,
  };
}

function getRelevantImmediateActionKeys(titleKey, context, matches) {
  const actionKeys = [];

  if (titleKey === "water_inlet") {
    actionKeys.push("check_water_tap", "check_inlet_hose_kinks", "clean_hose_connection_filter", "unplug_one_to_two_minutes");
  }
  if (titleKey === "heating_temperature") {
    actionKeys.push("unplug_one_to_two_minutes", "inspect_inner_filters_for_dirt");
  }
  if (titleKey === "drainage") {
    actionKeys.push("clean_filters", "check_drain_hose", "check_pump_blockage", "unplug_one_to_two_minutes");
  }
  if (titleKey === "leak_overflow") {
    actionKeys.push("check_base_tray_for_water");
    if (hasLeakOverflowContext(context.combinedText)) {
      actionKeys.push("tilt_forward_to_drain_base_tray_water");
    }
  }

  for (const entry of matches.immediateMatches) {
    for (const key of arrayValue(entry.actionKeys)) {
      if (key === "tilt_forward_to_drain_base_tray_water" && !hasLeakOverflowContext(context.combinedText)) {
        continue;
      }
      actionKeys.push(key);
    }
  }

  const dedupedKeys = dedupe(actionKeys);
  if (titleKey === "drainage" && dedupedKeys.includes("clean_filters")) {
    return dedupedKeys.filter((key) => key !== "inspect_inner_filters_for_dirt");
  }
  return dedupedKeys;
}

function buildClaimGuidanceItemsLegacy(copy, claim, categories, selectedAreas, topMatch, context, language) {
  if (topMatch?.titleKey === "water_inlet") {
    return getWaterInletResponseCopy(language, topMatch.code).claimGuidance;
  }
  if (topMatch?.titleKey === "heating_temperature") {
    return [`Mention that the dishwasher is not heating or the water stays cold, and add ${normalizeCode(topMatch.code || "E3")} if it appears on the display.`];
  }
  if (topMatch?.titleKey === "drainage") {
    return [`Mention that the dishwasher is not draining properly, and add ${normalizeCode(topMatch.code || "E02")} if it appears on the display.`];
  }
  if (topMatch?.titleKey === "leak_overflow") {
    return ["Mention that the dishwasher is leaking, keeps pumping, or there may be water in the base tray, and include a photo if possible."];
  }

  const steps = [];

  if (topMatch?.code) {
    steps.push(`Mention ${normalizeCode(topMatch.code)} in your claim if it appears on the display or matches the issue.`);
  }
  if (!normalizeText(claim.contractNumber)) {
    steps.push(copy.nextMissingContract);
  }
  if (!selectedAreas.length) {
    steps.push(copy.nextMissingArea);
  }
  if (categories.some(isApplianceCategory) && !normalizeText(claim.serialNumber)) {
    steps.push(copy.nextMissingSerial);
  }
  if (!claim.attachmentCount) {
    if (topMatch?.code || /\bdisplay|error|code|anzeige|fehler/i.test(context.combinedText)) {
      steps.push("Attach a photo of the display or error if possible.");
    } else {
      steps.push(copy.nextMissingAttachments);
    }
  }
  if (!normalizeText(claim.availabilityDate) && !normalizeText(claim.availabilityTime)) {
    steps.push(copy.nextMissingAvailability);
  }
  if (!claim.hasPhone && !claim.hasEmail) {
    steps.push(copy.nextMissingContact);
  }

  return dedupe(steps).slice(0, 5);
}

function buildSuggestedProblemDescriptionLegacy(topMatch, context, language) {
  const explicitCode = topMatch?.code ? normalizeCode(topMatch.code) : "";
  const issueKey = topMatch?.titleKey || "";

  if (issueKey === "heating_temperature") {
    return `My Amica dishwasher is not heating properly${explicitCode ? ` and may show error code ${explicitCode}` : ""}. The water stays cold and does not reach the required temperature. I reset the appliance and checked the filters, but the issue remains. Please arrange a check or advise on the next step.`;
  }
  if (issueKey === "water_inlet") {
    return getWaterInletResponseCopy(language, explicitCode).suggestedDescription;
  }
  if (issueKey === "leak_overflow") {
    return `My Amica dishwasher appears to have a leak or overflow problem${explicitCode ? ` and may show error code ${explicitCode}` : ""}. The appliance keeps pumping and there may be water in the base tray. Please arrange a check or advise on the next step.`;
  }
  if (issueKey === "drainage") {
    return `My Amica dishwasher is not draining properly${explicitCode ? ` and may show error code ${explicitCode}` : ""}. I checked the filters, drain hose, and pump area, but the issue remains. Please arrange a check or advise on the next step.`;
  }

  const fallback = normalizeText(context.combinedText).replace(/\s+/g, " ");
  if (!fallback) {
    return "My Amica dishwasher is not working properly. Please check the appliance and advise on the next step.";
  }
  return `My Amica dishwasher has the following issue: ${fallback}. Please check the appliance and advise on the next step.`;
}

function scoreKnowledgeEntry(entry, combinedText, errorCodes) {
  let score = 0;
  if (entry.code && errorCodes.includes(normalizeCode(entry.code))) {
    score += 1000;
  }

  for (const term of arrayValue(entry.triggerTerms)) {
    const normalizedTerm = normalizeText(term).toLowerCase();
    if (normalizedTerm && combinedText.includes(normalizedTerm)) {
      score += entry.topicType === "error_code" ? 40 : 15;
    }
  }

  if (entry.topicType === "immediate_step") {
    score += 5;
  }

  return score;
}

function translateKnowledgeList(keys, language) {
  const dictionary = knowledgeText(language).details;
  return dedupe(arrayValue(keys).map((key) => dictionary[key] || null));
}

function renderKnowledgeEntry(entry, language, copy) {
  const knowledgeCopy = knowledgeText(language);
  const codeLabel = entry.code ? `${normalizeCode(entry.code)} (${knowledgeCopy.titles[entry.titleKey] || entry.titleKey})` : (knowledgeCopy.titles[entry.titleKey] || entry.titleKey);
  const sections = [`${copy.knowledgeGeneralCode}: ${codeLabel}`];

  const symptoms = translateKnowledgeList(entry.symptomKeys, language);
  const checks = translateKnowledgeList(entry.checkKeys, language);
  const causes = translateKnowledgeList(entry.causeKeys, language);
  const actions = translateKnowledgeList(entry.actionKeys, language);

  if (symptoms.length) sections.push(formatSection(copy.knowledgeSymptomsTitle, symptoms));
  if (checks.length) sections.push(formatSection(copy.knowledgeChecksTitle, checks));
  if (causes.length) sections.push(formatSection(copy.knowledgeCausesTitle, causes));
  if (actions.length) sections.push(formatSection(copy.knowledgeActionsTitle, actions));

  return sections.filter(Boolean).join("\n");
}

function selectKnowledgeMatches(entries, context) {
  const scored = entries
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(entry, context.combinedText.toLowerCase(), context.errorCodes),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.priority - a.entry.priority || a.entry.slug.localeCompare(b.entry.slug));

  const codeMatches = [];
  const immediateMatches = [];

  for (const item of scored) {
    if (item.entry.topicType === "error_code") {
      if (!codeMatches.some((entry) => entry.slug === item.entry.slug)) {
        codeMatches.push(item.entry);
      }
      continue;
    }
    if (!immediateMatches.some((entry) => entry.slug === item.entry.slug)) {
      immediateMatches.push(item.entry);
    }
  }

  if (context.errorCodes.includes("E4") && !immediateMatches.some((entry) => entry.titleKey === "check_base_tray")) {
    const fallbackBaseTray = entries.find((entry) => entry.titleKey === "check_base_tray");
    if (fallbackBaseTray) immediateMatches.push(fallbackBaseTray);
  }

  return {
    codeMatches: codeMatches.slice(0, 2),
    immediateMatches: immediateMatches.slice(0, 3),
  };
}

async function loadDishwasherKnowledgeEntries() {
  return prisma.serviceClaimKnowledgeEntry.findMany({
    where: {
      brand: "Amica",
      applianceType: "dishwasher",
      isActive: true,
    },
    orderBy: [
      { priority: "desc" },
      { slug: "asc" },
    ],
  });
}

function buildKnowledgeAnswerLegacy({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const copy = t(language);
  const topMatch = matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  const issueSummary = getIssueSummaryKey(topMatch.titleKey);
  const explicitCodeMentioned = arrayValue(dishwasherContext.explicitErrorCodes).includes(normalizeCode(topMatch.code));
  const intro = `This sounds like a ${issueSummary}${topMatch.code ? explicitCodeMentioned ? ` and matches error code ${normalizeCode(topMatch.code)} on Amica dishwashers.` : `, often linked to error code ${normalizeCode(topMatch.code)} on Amica dishwashers.` : "."}`;
  const troubleshootingActions = translateKnowledgeList(
    getRelevantImmediateActionKeys(topMatch.titleKey, dishwasherContext, matches),
    language,
  ).slice(0, 4);
  const claimGuidance = buildClaimGuidanceItems(copy, claim || {}, [], selectedAreas, topMatch, dishwasherContext, language);
  const suggestedDescription = buildSuggestedProblemDescription(topMatch, dishwasherContext, language);
  const displayedActions =
    topMatch.titleKey === "water_inlet"
      ? getWaterInletResponseCopy(language, topMatch.code).actions
      : troubleshootingActions;
  const outro = topMatch.titleKey === "water_inlet"
    ? "You can copy this into the claim form. If an error code appears, include it too."
    : "You can copy this into the claim form. If anything changes or an error code appears, include that too.";

  return buildSpecificSupportAnswer({
    intro,
    steps: displayedActions,
    claimGuidance,
    description: suggestedDescription,
    outro,
  });
}

function getIssueSummaryKeyByLanguage(titleKey, language) {
  if (language === "de") {
    if (titleKey === "water_inlet") return "Problem mit dem Wasserzulauf";
    if (titleKey === "heating_temperature") return "Heiz- oder Temperaturproblem";
    if (titleKey === "leak_overflow") return "Leck- oder Überlaufproblem";
    if (titleKey === "drainage") return "Problem mit dem Wasserablauf";
    return "Problem mit dem Geschirrspüler";
  }
  if (titleKey === "water_inlet") return "water inlet problem";
  if (titleKey === "heating_temperature") return "heating problem";
  if (titleKey === "leak_overflow") return "leak or overflow problem";
  if (titleKey === "drainage") return "drainage problem";
  return "dishwasher problem";
}

function buildClarifyingAnswer({ intro, lead, options, detailPrompt }) {
  return [
    intro,
    lead == null ? "To help you faster, which of these fits best?" : lead,
    options.map((item) => `- ${item}`).join("\n"),
    detailPrompt,
  ].join("\n\n");
}

function buildSpecificSupportAnswer({ intro, stepsTitle, steps, claimTitle, claimGuidance, descriptionTitle, description, outro }) {
  return [
    intro,
    formatSection(stepsTitle || "You can try", steps),
    formatSection(claimTitle || "For the claim form", claimGuidance),
    formatQuotedBlock(descriptionTitle || "Suggested problem description", description),
    outro == null ? "You can copy this into the claim form. If anything changes or you see an error code, include that too." : outro,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildGeneralClarifyingAnswer(context, language) {
  if (language === "de") {
    if (context.type === "appliance_vague") {
      return buildClarifyingAnswer({
        intro: "Es tut mir leid, dass Sie Probleme mit einem Gerät haben.",
        lead: "Damit ich schneller helfen kann: Was passt am besten?",
        options: [
          "Es schaltet sich nicht ein oder funktioniert gar nicht.",
          "Es heizt, kühlt oder pumpt nicht richtig.",
          "Es ist undicht, macht ungewöhnliche Geräusche oder riecht ungewöhnlich.",
          "Auf dem Display wird ein Fehlercode angezeigt.",
          "Es gibt einen sichtbaren Schaden oder etwas anderes stimmt nicht.",
        ],
        detailPrompt: "Wenn möglich, beschreiben Sie bitte auch, was das Gerät genau macht oder ob ein Fehlercode angezeigt wird.",
      });
    }

    return buildClarifyingAnswer({
      intro: context.subject === "the kitchen" ? "Es tut mir leid, dass es in der Küche ein Problem gibt." : "Es tut mir leid, dass Sie Probleme damit haben.",
      lead: "Damit ich schneller helfen kann: Was passt am besten?",
      options: [
        "Ein Gerät funktioniert nicht.",
        "Es gibt ein Leck oder ein Wasserproblem.",
        "Spüle, Wasserhahn oder Abfluss ist verstopft oder beschädigt.",
        "Es gibt ein Problem mit Strom oder Beleuchtung.",
        "Etwas ist kaputt oder beschädigt.",
      ],
      detailPrompt: "Wenn möglich, nennen Sie bitte auch den betroffenen Gegenstand oder Bereich.",
    });
  }

  if (context.type === "appliance_vague") {
    return buildClarifyingAnswer({
      intro: `I'm sorry you're having trouble with ${context.subject}.`,
      lead: "To help you faster, which of these fits best?",
      options: [
        "It is not turning on or not working at all.",
        "It is not heating, cooling, or draining properly.",
        "It is leaking, making unusual noise, or smells unusual.",
        "It shows an error code on the display.",
        "There is visible damage or something else is wrong.",
      ],
      detailPrompt: "If you can, also tell me what the appliance is doing or whether an error code is shown.",
    });
  }

  return buildClarifyingAnswer({
    intro: context.subject === "the kitchen" ? "I'm sorry you're having trouble in the kitchen." : "I'm sorry you're having trouble with this.",
    lead: "To help you faster, which of these fits best?",
    options: [
      "An appliance is not working.",
      "There is a leak or water issue.",
      "A sink, tap, or drain is blocked or damaged.",
      "There is an electrical or lighting issue.",
      "Something is broken or damaged.",
    ],
    detailPrompt: "If you can, also tell me which item or area is affected.",
  });
}

function getGeneralSpecificSupportData(context, language) {
  if (language === "de") {
    if (context.type === "appliance_choice") {
      return {
        intro: "Welches Gerät funktioniert nicht?",
        options: [
          "Spülmaschine",
          "Backofen",
          "Kühlschrank oder Gefrierschrank",
          "Waschmaschine oder Trockner",
          "Kochfeld oder Herd",
          "Dunstabzugshaube",
          "Ein anderes Gerät",
        ],
      };
    }

    if (context.type === "leak") {
      return {
        intro: "Das klingt nach einem Leck oder Wasserproblem.",
        steps: [
          "Wenn Wasser austritt, benutzen Sie den betroffenen Bereich vorerst nicht weiter.",
          "Wischen Sie stehendes Wasser auf, wenn das sicher möglich ist.",
          "Prüfen Sie, wo das Wasser austritt, zum Beispiel unter der Spüle, am Wasserhahn, am Schlauch oder am Gerät.",
          "Machen Sie ein Foto der nassen Stelle oder der undichten Verbindung.",
        ],
        claimGuidance: ["Geben Sie an, wo das Wasser austritt und ob es dauerhaft tropft oder plötzlich ausgelaufen ist."],
        description:
          "Es gibt ein Leck oder Wasserproblem im betroffenen Bereich. Wasser tritt aus oder sammelt sich dort. Bitte prüfen Sie die Ursache und veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "drainage") {
      return {
        intro: "Das klingt nach einer Verstopfung oder einem Ablaufproblem.",
        steps: [
          "Benutzen Sie Spüle oder Ablauf nicht weiter, wenn sich das Wasser zurückstaut.",
          "Prüfen Sie, ob der Ablauf komplett blockiert ist oder nur langsam abläuft.",
          "Entfernen Sie stehendes Wasser, wenn das sicher möglich ist.",
          "Machen Sie ein Foto, falls die Verstopfung oder Überlaufspur sichtbar ist.",
        ],
        claimGuidance: ["Geben Sie an, dass Spüle oder Ablauf verstopft sind oder nicht richtig ablaufen, und fügen Sie wenn möglich ein Foto hinzu."],
        description:
          "Die Spüle oder der Ablauf ist verstopft oder läuft nicht richtig ab. Das Wasser läuft nur langsam ab oder staut sich zurück. Bitte prüfen Sie den Fall oder veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "electrical") {
      return {
        intro: "Das klingt nach einem Strom- oder Beleuchtungsproblem.",
        steps: [
          "Wenn es sicher ist, benutzen Sie die betroffene Leuchte, den Schalter oder die Steckdose vorerst nicht weiter.",
          "Prüfen Sie, ob nur ein einzelner Punkt betroffen ist oder der ganze Bereich.",
          "Notieren Sie Flackern, Stromausfall oder eine ausgelöste Sicherung.",
          "Machen Sie ein Foto, falls ein sichtbarer Schaden vorhanden ist.",
        ],
        claimGuidance: ["Geben Sie an, welcher Bereich betroffen ist und ob kein Strom vorhanden ist, etwas flackert oder ein sichtbarer Schaden vorliegt."],
        description:
          "Im betroffenen Bereich liegt ein Strom- oder Beleuchtungsproblem vor. Bitte prüfen Sie die Installation und teilen Sie mir die nächsten Schritte mit oder veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "damage") {
      return {
        intro: "Was genau ist kaputt oder beschädigt?",
        steps: [
          "Schrank oder Tür",
          "Arbeitsplatte",
          "Gerät",
          "Fenster oder Tür",
          "Möbel",
          "Sonstiger Bereich",
        ],
      };
    }

    if (context.type === "damage_choice") {
      return {
        intro: "Was genau ist kaputt oder beschädigt?",
        steps: [
          "Schrank oder Tür",
          "Arbeitsplatte",
          "Gerät",
          "Fenster oder Tür",
          "Möbel",
          "Sonstiger Bereich",
        ],
      };
    }

    return null;
  }

  if (context.type === "leak") {
    return {
      intro: `This sounds like a leak around ${context.subject}.`,
      steps: [
        "If safe, stop using the affected sink or fitting for now.",
        "Check whether the water is coming from the pipe, drain, or tap connection.",
        "Wipe up standing water to limit further damage.",
        "Take a photo of the leak or wet area if possible.",
      ],
      claimGuidance: ["Mention where the leak is and attach a photo if possible."],
      description:
        "There is water leaking in the affected area. The surface underneath is wet, and the leak may be coming from the pipe, drain, or connection. Please arrange an inspection or repair.",
    };
  }

  if (context.type === "drainage") {
    return {
      intro: `This sounds like a blockage or drainage problem around ${context.subject}.`,
      steps: [
        "Stop using the sink or drain if water is backing up.",
        "Check whether the blockage is complete or only draining slowly.",
        "Remove standing water if it is safe to do so.",
        "Take a photo if the blockage or overflow is visible.",
      ],
      claimGuidance: ["Mention that the sink or drain is blocked or not draining properly, and include a photo if possible."],
      description:
        "The sink or drain is blocked or not draining properly. Water may be draining slowly or backing up. Please arrange a check or repair.",
    };
  }

  if (context.type === "electrical") {
    return {
      intro: `This sounds like an electrical or lighting issue with ${context.subject}.`,
      steps: [
        "If safe, stop using the affected light, switch, or socket for now.",
        "Check whether only one fitting is affected or the whole area.",
        "Note any flickering, loss of power, or tripped fuse.",
        "Take a photo if there is visible damage.",
      ],
      claimGuidance: ["Mention the affected area and whether the issue is no power, flickering, or visible damage."],
      description:
        "There is an electrical or lighting issue in the affected area. Please check the fitting and advise on the next step or arrange a repair.",
    };
  }

  if (context.type === "damage") {
    return {
      intro: `This sounds like a damaged or broken item in ${context.subject}.`,
      steps: [
        "Take a clear photo of the damaged part.",
        "Note whether the item is still usable or no longer works properly.",
        "Avoid forcing moving parts if they are stuck or loose.",
      ],
      claimGuidance: ["Mention what is broken or damaged and attach a photo if possible."],
      description:
        "There is visible damage to the affected item. Please inspect it and advise on the next step or arrange a repair.",
    };
  }

  return null;
}

function buildGeneralSpecificAnswer(context, language, formHelpOnly = false) {
  const support = getGeneralSpecificSupportData(context, language);
  if (!support) return "";

  if (context.type === "appliance_choice") {
    return buildClarifyingAnswer({
      intro: support.intro,
      lead: "",
      options: support.options,
      detailPrompt: "",
    });
  }

  if (context.type === "damage" || context.type === "damage_choice") {
    return buildSpecificSupportAnswer({
      intro: support.intro,
      stepsTitle: language === "de"
        ? "Bitte nennen Sie den betroffenen Gegenstand oder Bereich, zum Beispiel"
        : "Please name the affected item or area, for example",
      steps: support.steps,
      claimTitle: "",
      claimGuidance: [],
      descriptionTitle: "",
      description: "",
      outro: "",
    });
  }

  if (formHelpOnly) {
    return buildClaimFormHelpAnswer({
      language,
      claimGuidance: support.claimGuidance,
      description: support.description,
    });
  }

  return buildCompactSupportAnswer({
    language,
    intro: support.intro,
    steps: support.steps,
  });
}

function buildDishwasherClarifyingAnswer(language) {
  if (language === "de") {
    return buildClarifyingAnswer({
      intro: "Es tut mir leid, dass Sie Probleme mit der Spülmaschine haben.",
      lead: "Damit ich schneller helfen kann: Was passt am besten?",
      options: [
        "Sie heizt nicht oder das Wasser bleibt kalt.",
        "Sie zieht kein Wasser.",
        "Sie pumpt nicht ab.",
        "Sie ist undicht, pumpt dauerhaft oder es befindet sich Wasser in der Bodenwanne.",
        "Auf dem Display wird ein Fehlercode angezeigt.",
      ],
      detailPrompt: "Wenn möglich, nennen Sie bitte auch den Fehlercode oder beschreiben Sie, was die Spülmaschine genau macht.",
    });
  }

  return buildClarifyingAnswer({
    intro: "I'm sorry you're having trouble with the dishwasher.",
    lead: "To help you faster, which of these fits best?",
    options: [
      "It is not heating or the water stays cold.",
      "It is not taking in water.",
      "It is not draining.",
      "It is leaking, keeps pumping, or there may be water in the base tray.",
      "It shows an error code on the display.",
    ],
    detailPrompt: "If you can, also tell me the error code or what the dishwasher is doing.",
  });
}

function buildDishwasherErrorCodePromptAnswer(language) {
  if (language === "de") {
    return [
      "Ich helfe Ihnen gerne weiter. Welcher Fehlercode wird auf dem Display angezeigt?",
      [
        "Häufige Amica-Fehlercodes sind:",
        "- E1: Problem mit dem Wasserzulauf",
        "- E3: Heiz- oder Temperaturproblem",
        "- E4: Leck oder Überlauf",
        "- E02: Problem mit dem Wasserablauf",
      ].join("\n"),
      "Bitte nennen Sie mir den Fehlercode, dann gebe ich Ihnen die passenden Schritte und eine Formulierung für das Schadensformular.",
    ].join("\n\n");
  }

  return [
    "I can help with that. What error code is shown on the display?",
    [
      "Common Amica dishwasher codes include:",
      "- E1: Water inlet problem",
      "- E3: Heating or temperature problem",
      "- E4: Leak or overflow problem",
      "- E02: Water drainage problem",
    ].join("\n"),
    "Please tell me the code, and I can give you the right troubleshooting steps and claim wording.",
  ].join("\n\n");
}

function getWaterInletResponseCopy(language, code) {
  const normalizedCode = normalizeCode(code || "E1");
  if (language === "de") {
    return {
      actions: [
        "Ist der Wasserhahn vollständig geöffnet?",
        "Ist der Zulaufschlauch geknickt oder blockiert?",
        "Reinigen Sie das kleine Sieb im Schlauchanschluss.",
        "Ziehen Sie den Stecker für etwa 1–2 Minuten, um die Elektronik zurückzusetzen.",
      ],
      claimGuidance: [`Geben Sie an, dass der Geschirrspüler kein Wasser zieht. Fügen Sie ${normalizedCode} hinzu, falls dieser Fehlercode angezeigt wird.`],
      suggestedDescription:
        `Mein Amica-Geschirrspüler zieht kein Wasser. ${normalizedCode ? `${normalizedCode} wird angezeigt. ` : ""}Ich habe den Wasserhahn und den Zulaufschlauch geprüft, aber das Problem besteht weiterhin. Bitte prüfen Sie das Gerät oder teilen Sie mir die nächsten Schritte mit.`,
      outro: "Sie können diesen Text in das Formular kopieren. Falls ein Fehlercode angezeigt wird, fügen Sie ihn bitte hinzu.",
    };
  }
  return {
    whatItMeans: ["The dishwasher is not getting enough water."],
    actions: [
      "Check that the water tap is fully open.",
      "Check whether the inlet hose is bent or kinked.",
      "Clean the small filter or sieve in the hose connection.",
      "Unplug the dishwasher for 1 to 2 minutes to reset it.",
    ],
    claimGuidance: [`Mention that the dishwasher is not taking in water and add ${normalizedCode} if it appears on the display.`],
    suggestedDescription:
      `My Amica dishwasher is not taking in water${normalizedCode ? ` and may show error code ${normalizedCode}` : ""}. I checked the water tap and inlet hose, but the issue remains. Please arrange a check or advise on the next step.`,
  };
}

function buildClaimGuidanceItems(copy, claim, categories, selectedAreas, topMatch, context, language) {
  if (topMatch?.titleKey === "water_inlet") {
    return getWaterInletResponseCopy(language, topMatch.code).claimGuidance;
  }
  if (topMatch?.titleKey === "heating_temperature") {
    return language === "de"
      ? [`Geben Sie an, dass der Geschirrspüler nicht richtig heizt oder das Wasser kalt bleibt. Fügen Sie ${normalizeCode(topMatch.code || "E3")} hinzu, falls dieser Fehlercode angezeigt wird.`]
      : [`Mention that the dishwasher is not heating or the water stays cold, and add ${normalizeCode(topMatch.code || "E3")} if it appears on the display.`];
  }
  if (topMatch?.titleKey === "drainage") {
    return language === "de"
      ? [`Geben Sie an, dass der Geschirrspüler nicht abpumpt. Fügen Sie ${normalizeCode(topMatch.code || "E02")} hinzu, falls dieser Fehlercode angezeigt wird.`]
      : [`Mention that the dishwasher is not draining properly, and add ${normalizeCode(topMatch.code || "E02")} if it appears on the display.`];
  }
  if (topMatch?.titleKey === "leak_overflow") {
    return language === "de"
      ? ["Geben Sie an, dass der Geschirrspüler undicht ist, dauerhaft pumpt oder Wasser in der Bodenwanne sein könnte. Fügen Sie E4 hinzu, falls dieser Fehlercode angezeigt wird."]
      : ["Mention that the dishwasher is leaking, keeps pumping, or there may be water in the base tray, and include a photo if possible."];
  }

  return [];
}

function buildSuggestedProblemDescription(topMatch, context, language) {
  const explicitCode = topMatch?.code ? normalizeCode(topMatch.code) : "";
  const issueKey = topMatch?.titleKey || "";

  if (language === "de") {
    if (issueKey === "heating_temperature") {
      return `Mein Amica-Geschirrspüler heizt nicht richtig. ${explicitCode ? `${explicitCode} wird angezeigt. ` : ""}Das Wasser bleibt kalt oder erreicht nicht die erforderliche Temperatur. Ich habe das Gerät zurückgesetzt und die Siebe geprüft, aber das Problem besteht weiterhin. Bitte prüfen Sie das Gerät oder teilen Sie mir die nächsten Schritte mit.`;
    }
    if (issueKey === "water_inlet") {
      return getWaterInletResponseCopy(language, explicitCode).suggestedDescription;
    }
    if (issueKey === "leak_overflow") {
      return `Mein Amica-Geschirrspüler scheint undicht zu sein oder ein Überlaufproblem zu haben. ${explicitCode ? `${explicitCode} wird angezeigt. ` : ""}Das Gerät pumpt dauerhaft oder es könnte sich Wasser in der Bodenwanne befinden. Bitte prüfen Sie das Gerät oder teilen Sie mir die nächsten Schritte mit.`;
    }
    if (issueKey === "drainage") {
      return `Mein Amica-Geschirrspüler pumpt nicht richtig ab. ${explicitCode ? `${explicitCode} wird angezeigt. ` : ""}Ich habe die Siebe, den Ablaufschlauch und den Pumpenbereich geprüft, aber das Problem besteht weiterhin. Bitte prüfen Sie das Gerät oder teilen Sie mir die nächsten Schritte mit.`;
    }
  }

  if (issueKey === "heating_temperature") {
    return `My Amica dishwasher is not heating properly${explicitCode ? ` and may show error code ${explicitCode}` : ""}. The water stays cold and does not reach the required temperature. I reset the appliance and checked the filters, but the issue remains. Please arrange a check or advise on the next step.`;
  }
  if (issueKey === "water_inlet") {
    return getWaterInletResponseCopy(language, explicitCode).suggestedDescription;
  }
  if (issueKey === "leak_overflow") {
    return `My Amica dishwasher appears to have a leak or overflow problem${explicitCode ? ` and may show error code ${explicitCode}` : ""}. The appliance keeps pumping and there may be water in the base tray. Please arrange a check or advise on the next step.`;
  }
  if (issueKey === "drainage") {
    return `My Amica dishwasher is not draining properly${explicitCode ? ` and may show error code ${explicitCode}` : ""}. I checked the filters, drain hose, and pump area, but the issue remains. Please arrange a check or advise on the next step.`;
  }

  const fallback = normalizeText(context.combinedText).replace(/\s+/g, " ");
  if (!fallback) {
    return language === "de"
      ? "Mein Amica-Geschirrspüler funktioniert nicht richtig. Bitte prüfen Sie das Gerät und teilen Sie mir die nächsten Schritte mit."
      : "My Amica dishwasher is not working properly. Please check the appliance and advise on the next step.";
  }
  return language === "de"
    ? `Mein Amica-Geschirrspüler hat folgendes Problem: ${fallback}. Bitte prüfen Sie das Gerät und teilen Sie mir die nächsten Schritte mit.`
    : `My Amica dishwasher has the following issue: ${fallback}. Please check the appliance and advise on the next step.`;
}

function buildKnowledgeAnswer({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const topMatch = matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  const explicitCodeMentioned = arrayValue(dishwasherContext.explicitErrorCodes).includes(normalizeCode(topMatch.code));
  const issueSummary = getIssueSummaryKeyByLanguage(topMatch.titleKey, language);
  const intro = language === "de"
    ? `Das klingt nach einem ${issueSummary}${topMatch.code ? explicitCodeMentioned ? `, passend zu Fehlercode ${normalizeCode(topMatch.code)} bei Amica-Geschirrspülern.` : `, häufig verbunden mit Fehlercode ${normalizeCode(topMatch.code)} bei Amica-Geschirrspülern.` : "."}`
    : `This sounds like a ${issueSummary}${topMatch.code ? explicitCodeMentioned ? ` and matches error code ${normalizeCode(topMatch.code)} on Amica dishwashers.` : `, often linked to error code ${normalizeCode(topMatch.code)} on Amica dishwashers.` : "."}`;
  const troubleshootingActions = translateKnowledgeList(
    getRelevantImmediateActionKeys(topMatch.titleKey, dishwasherContext, matches),
    language,
  ).slice(0, 4);
  const displayedActions =
    topMatch.titleKey === "water_inlet"
      ? getWaterInletResponseCopy(language, topMatch.code).actions
      : troubleshootingActions;
  return buildCompactSupportAnswer({
    language,
    intro,
    steps: displayedActions,
  });
}

function buildKnowledgeClaimFormHelpAnswer({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const topMatch = matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  return buildClaimFormHelpAnswer({
    language,
    claimGuidance: buildClaimGuidanceItems({}, claim || {}, [], selectedAreas, topMatch, dishwasherContext, language),
    description: buildSuggestedProblemDescription(topMatch, dishwasherContext, language),
  });
}

async function buildAnswer({ language, question, context, selectedAreas, claim, conversationMessages }) {
  const genericAnswer = buildGenericAnswer({ language, question, context, selectedAreas, claim });
  const wantsClaimFormHelp = isClaimFormHelpRequest(question) || isSampleWordingRequest(question);

  if (isGreeting(question)) {
    return normalizeAssistantReturn(genericAnswer);
  }

  const dishwasherContext = enrichDishwasherContextWithConversation(
    getDishwasherContext({ question, claim, selectedAreas }),
    conversationMessages,
  );
  if (dishwasherContext.hasDishwasherContext) {
    const entries = await loadDishwasherKnowledgeEntries();
    const matches = selectKnowledgeMatches(entries, dishwasherContext);
    if (wantsClaimFormHelp && matches.codeMatches.length) {
      return normalizeAssistantReturn(
        buildKnowledgeClaimFormHelpAnswer({
          language,
          question,
          context,
          selectedAreas,
          claim,
          matches,
          dishwasherContext,
        }),
      );
    }
    if (!matches.codeMatches.length && hasOnlyDishwasherErrorCodeDisplayContext(dishwasherContext.combinedText)) {
      return normalizeAssistantReturn(buildDishwasherErrorCodePromptAnswer(language));
    }
    if (!matches.codeMatches.length && !hasSpecificDishwasherSymptom(dishwasherContext.combinedText)) {
      return normalizeAssistantReturn(buildDishwasherClarifyingAnswer(language));
    }
    if (!matches.codeMatches.length) {
      return normalizeAssistantReturn(genericAnswer);
    }

    return normalizeAssistantReturn(
      buildKnowledgeAnswer({
        language,
        question,
        context,
        selectedAreas,
        claim,
        matches,
        dishwasherContext,
      }),
    );
  }

  const generalContext = classifyGeneralIssue({
    question,
    claim,
    selectedAreas,
    conversationMessages,
  });
  if (wantsClaimFormHelp) {
    const formHelpAnswer = buildGeneralSpecificAnswer(generalContext, language, true);
    if (formHelpAnswer) {
      return normalizeAssistantReturn(formHelpAnswer);
    }
  }
  const specificAnswer = buildGeneralSpecificAnswer(generalContext, language, false);

  if (specificAnswer) {
    return normalizeAssistantReturn(specificAnswer);
  }

  if (["appliance_vague", "area_vague", "generic_vague"].includes(generalContext.type)) {
    return normalizeAssistantReturn(buildGeneralClarifyingAnswer(generalContext, language));
  }

  return normalizeAssistantReturn(genericAnswer);
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims-assistant:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const conversationMessages = normalizeConversationMessages(body?.conversationMessages);
    const language = resolveAssistantLanguage({
      requestedLanguage: normalizeLanguage(body?.language),
      question: body?.question,
      conversationMessages,
    });
    const question = normalizeText(body?.question);
    if (!question) {
      return NextResponse.json({ error: t(language).unavailable }, { status: 400 });
    }

    const built = normalizeAssistantReturn(
      await buildAnswer({
        language,
        question,
        context: body?.context || null,
        conversationMessages,
        selectedAreas: Array.isArray(body?.selectedAreas) ? body.selectedAreas : [],
        claim: body?.claim || {},
      }),
    );

    const finalAnswer =
      language === "de" && detectExplicitLanguageSwitch(question) === "de"
        ? `Natürlich, ich kann auf Deutsch antworten.\n\n${built.answer}`
        : built.answer;

    const payload = { answer: finalAnswer, language };
    if (built.actions?.length) {
      payload.actions = built.actions;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Service claim assistant error:", error);
    return NextResponse.json(
      { error: error?.message || COPY.en.unavailable },
      { status: 500 },
    );
  }
}
