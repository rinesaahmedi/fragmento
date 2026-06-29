"use client";

import { useEffect, useRef } from "react";

const AVATAR_BASE_PATH = "/AVATAR";

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.legacySrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", reject, { once: true });
    document.body.appendChild(script);
  });
}

async function loadExternalScriptSafe(src) {
  try {
    await loadExternalScript(src);
  } catch (error) {
    console.warn(`Failed to load legacy external script: ${src}`, error);
  }
}

const DISHWASHER_BASE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 10 24 L 14 44 H 46 L 50 24 Z"/><line x1="18" y1="26" x2="20" y2="44"/><line x1="26" y1="26" x2="26" y2="44"/><line x1="34" y1="26" x2="34" y2="44"/><line x1="42" y1="26" x2="40" y2="44"/><line x1="12" y1="32" x2="48" y2="32"/><line x1="13" y1="38" x2="47" y2="38"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">GS</text></svg>';

const LEGACY_ICON_MARKUP = {
  dishwasher: DISHWASHER_BASE_MARKUP,
  refrigerator: '<img src="/img/foto6.png" alt="Kuehlschrank">',
  base_cabinet_30: '<img src="/img/foto1.png" alt="Unterschrank 30cm">',
  wall_cabinet_l: '<img src="/img/foto4.png" alt="Oberschrank links">',
  wall_cabinet_r: '<img src="/img/foto2.png" alt="Oberschrank rechts">',
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
  delivery_assembly:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2.2-12.2l-4 4-1.4-1.4-1.4 1.4 2.8 2.8 5.4-5.4-1.4-1.4z"/></svg>',
  pickup: '<img src="/img/warehouse.png" alt="Abholung im Lager">',
  waste_system:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  cutlery_insert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/><rect x="8" y="8" width="3" height="3" rx="1"/><rect x="12" y="8" width="4" height="3" rx="1"/><rect x="8.5" y="12" width="3" height="9" rx="1"/><rect x="12.5" y="12" width="3" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  lighting_set:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
};

function formatLegacyCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function normalizeLegacyColorKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function buildLegacyComponentId(colorKey) {
  return `component-${colorKey.replace(/[^a-z0-9#]/gi, "").toLowerCase()}`;
}

function extractLegacyStrokeColor(element) {
  const stroke = element.getAttribute("stroke");
  if (!stroke || !stroke.trim()) {
    return "";
  }

  const normalized = stroke.trim().toLowerCase();
  if (!normalized.startsWith("rgb")) {
    return normalized;
  }

  const match = normalized.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    return normalized;
  }

  const toHex = (channel) => `0${Number.parseInt(channel, 10).toString(16)}`.slice(-2);
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function groupSvgElementsByColor(svg) {
  const groupsByColor = new Map();
  svg
    ?.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse")
    .forEach((element) => {
      if (element.closest("[data-component-id]")) {
        return;
      }

      const color = extractLegacyStrokeColor(element);
      if (!color) {
        return;
      }

      if (!groupsByColor.has(color)) {
        groupsByColor.set(color, []);
      }

      groupsByColor.get(color).push(element);
    });

  return groupsByColor;
}

function ensureLegacyCatalogRendered() {
  const config = window.__KITCHEN_CONFIG__;
  const combinedList = document.getElementById("combined-list");
  const svg = document.querySelector("#kitchen-svg-wrapper svg");

  if (!config || !combinedList) {
    return false;
  }

  const svgNamespace = "http://www.w3.org/2000/svg";
  const groupedByColor = groupSvgElementsByColor(svg);
  const lockedColors = [
    ...(config.lockedBaseColors || []),
    ...((config.components || []).filter((item) => item.isLocked && item.colorKey).map((item) => item.colorKey)),
  ].map(normalizeLegacyColorKey);
  const lockedComponentIds = new Set(lockedColors.map(buildLegacyComponentId));
  const accessoryCodes = new Set((config.accessories || []).map((item) => item.code || item.id).filter(Boolean));
  const serviceCodes = new Set((config.services || []).map((item) => item.code || item.id).filter(Boolean));
  const existingItems = combinedList.querySelectorAll(".component-item, .accessory-item").length;
  const expectedItems =
    (config.components?.length || 0) + (config.accessories?.length || 0) + (config.services?.length || 0);

  const closeAllComponentInfoTooltips = () => {
    combinedList.querySelectorAll(".component-item.is-info-open").forEach((item) => {
      item.classList.remove("is-info-open");
      const trigger = item.querySelector(".component-info-trigger");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };

  const getSelectedComponentCodes = () =>
    Array.from(combinedList.querySelectorAll(".component-item.selected"))
      .map((item) => item.dataset.code || "")
      .filter(Boolean);


  const areAnyItemsSelected = () =>
    combinedList.querySelectorAll(".component-item.selected, .accessory-item[data-item-type=\"accessory\"].selected")
      .length > 0;

  const updateSelectionState = () => {
    const montageServiceItem = combinedList.querySelector(".accessory-item[data-code=\"SVC-MONTAGE-001\"]");
    if (montageServiceItem?.classList.contains("selected") && !areAnyItemsSelected()) {
      montageServiceItem.classList.remove("selected");
      window.showMessage?.("Die Montage-Dienstleistung wurde automatisch entfernt.");
    }

    const pickupServiceItem = combinedList.querySelector(".accessory-item[data-code=\"SVC-PICKUP-001\"]");
    if (pickupServiceItem?.classList.contains("selected") && !areAnyItemsSelected()) {
      pickupServiceItem.classList.remove("selected");
      window.showMessage?.("Die Abholung wurde automatisch entfernt.");
    }

    window.updateTotalPriceAndSummary?.();
  };

  const toggleComponentSelection = (componentId) => {
    if (!componentId || lockedComponentIds.has(componentId)) {
      return;
    }

    const listItem = combinedList.querySelector(`[data-target-id="${componentId}"]`);
    const svgGroup = svg?.querySelector(`[data-component-id="${componentId}"]`);
    if (!listItem) {
      return;
    }

    listItem.classList.toggle("selected");
    svgGroup?.classList.toggle("selected");
    updateSelectionState();
  };

  const bindCatalogInteractions = () => {
    combinedList.querySelectorAll(".accessory-item").forEach((listItem) => {
      const code = listItem.dataset.code || listItem.id || "";
      listItem.dataset.code = code;
      listItem.dataset.itemType = serviceCodes.has(code) ? "service" : accessoryCodes.has(code) ? "accessory" : "";
    });

    if (combinedList.dataset.catalogClickBound !== "true") {
      combinedList.addEventListener(
        "click",
        (event) => {
          const infoTrigger = event.target.closest(".component-info-trigger");
          if (infoTrigger) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const hostItem = infoTrigger.closest(".component-item");
            const willOpen = !hostItem?.classList.contains("is-info-open");
            closeAllComponentInfoTooltips();
            if (hostItem && willOpen) {
              hostItem.classList.add("is-info-open");
              infoTrigger.setAttribute("aria-expanded", "true");
            }
            return;
          }

          const item = event.target.closest(".component-item, .accessory-item");
          if (!item || !combinedList.contains(item)) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          closeAllComponentInfoTooltips();

          if (item.classList.contains("component-item")) {
            toggleComponentSelection(item.dataset.targetId);
            return;
          }

          const code = item.dataset.code || item.id || "";
          const isCurrentlySelected = item.classList.contains("selected");
          if (code === "SVC-MONTAGE-001" && !isCurrentlySelected && !areAnyItemsSelected()) {
            window.showMessage?.("Bitte wähle zuerst einen Artikel aus.", "error");
            return;
          }

          if (code === "SVC-PICKUP-001" && !isCurrentlySelected && !areAnyItemsSelected()) {
            window.showMessage?.("Bitte wähle zuerst einen Artikel für die Abholung aus.", "error");
            return;
          }

          item.classList.toggle("selected");

          if (item.classList.contains("selected")) {
            if (code === "SVC-MONTAGE-001") {
              combinedList.querySelector(".accessory-item[data-code=\"SVC-PICKUP-001\"]")?.classList.remove("selected");
            } else if (code === "SVC-PICKUP-001") {
              combinedList.querySelector(".accessory-item[data-code=\"SVC-MONTAGE-001\"]")?.classList.remove("selected");
            }
          }

          updateSelectionState();
        },
        true,
      );
      combinedList.dataset.catalogClickBound = "true";
    }

    if (document.body.dataset.legacyCatalogOutsideClickBound !== "true") {
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".component-name-wrap")) {
          closeAllComponentInfoTooltips();
        }
      });
      document.body.dataset.legacyCatalogOutsideClickBound = "true";
    }
  };

  const shouldBuildCatalogItems = !(existingItems > 0 && existingItems >= expectedItems);

  if (shouldBuildCatalogItems) {
    combinedList.innerHTML = "";
  }

  const createDivider = (title) => {
    const divider = document.createElement("div");
    divider.className = "list-divider";
    divider.innerHTML = `<h3>${title}</h3>`;
    combinedList.appendChild(divider);
  };

  const createAccessoryItem = (item) => {
    const listItem = document.createElement("li");
    listItem.className = "accessory-item";
    listItem.id = item.code || item.id;
    listItem.dataset.code = item.code || item.id || "";
    listItem.dataset.price = String(item.price ?? 0);
    listItem.innerHTML = `
      <span class="selection-indicator"></span>
      <div class="accessory-icon">${LEGACY_ICON_MARKUP[item.iconKey] || ""}</div>
      <div class="accessory-details">
        <span class="accessory-name">${item.name}</span>
        <span class="accessory-price">${formatLegacyCurrency(item.price)}</span>
      </div>`;
    return listItem;
  };

  (config.components || []).forEach((item) => {
    const colorKey = normalizeLegacyColorKey(item.colorKey);
    if (!colorKey) {
      return;
    }

    const componentId = buildLegacyComponentId(colorKey);
    const hadExistingSvgGroup = Boolean(svg?.querySelector(`[data-component-id="${componentId}"]`));
    let svgGroup = svg?.querySelector(`[data-component-id="${componentId}"]`);

    if (!svgGroup && svg && groupedByColor.has(colorKey)) {
      const elements = groupedByColor.get(colorKey);
      const firstElement = elements?.[0];
      const parent = firstElement?.parentNode;

      if (firstElement && parent) {
        svgGroup = document.createElementNS(svgNamespace, "g");
        svgGroup.classList.add("kitchen-component");
        svgGroup.dataset.componentId = componentId;
        parent.insertBefore(svgGroup, firstElement);
        elements.forEach((element) => svgGroup.appendChild(element));
      }
    }

    if (svgGroup) {
      svgGroup.classList.add("kitchen-component");
      svgGroup.dataset.componentId = componentId;
      if (item.price != null) {
        svgGroup.dataset.price = String(item.price);
      }

      if (lockedComponentIds.has(componentId)) {
        svgGroup.classList.add("is-locked", "selected");
      }

      if (!hadExistingSvgGroup && svgGroup.dataset.catalogBound !== "true") {
        svgGroup.dataset.catalogBound = "true";
      }
    }

    if (!shouldBuildCatalogItems) {
      return;
    }

    const listItem = document.createElement("li");
    listItem.className = "component-item";
    listItem.dataset.targetId = componentId;
    listItem.dataset.code = item.code || "";
    listItem.dataset.price = String(item.price ?? 0);

    if (item.infoText) {
      listItem.classList.add("has-info");
      listItem.dataset.hasInfo = "true";
    }

    if (lockedComponentIds.has(componentId)) {
      listItem.classList.add("selected");
    }

    const infoMarkup = item.infoText
      ? `
        <button type="button" class="component-info-trigger" aria-label="Info zu ${item.name}" aria-expanded="false">i</button>
        <div class="component-info-tooltip">${item.infoText}</div>`
      : "";

    listItem.innerHTML = `
      <span class="selection-indicator"></span>
      <span class="component-icon">${LEGACY_ICON_MARKUP[item.iconKey] || ""}</span>
      <span class="component-name-wrap">
        <span class="component-name">${item.name}</span>
        ${infoMarkup}
      </span>
      <span class="component-price">${formatLegacyCurrency(item.price)}</span>`;

    combinedList.appendChild(listItem);
  });

  if (shouldBuildCatalogItems) {
    if (config.accessories?.length) {
      createDivider("Zubehoer");
      config.accessories.forEach((item) => {
        combinedList.appendChild(createAccessoryItem(item));
      });
    }

    if (config.services?.length) {
      createDivider("Dienstleistungen hinzufuegen");
      config.services.forEach((item) => {
        combinedList.appendChild(createAccessoryItem(item));
      });
    }
  }

  bindCatalogInteractions();
  updateSelectionState();
  return true;
}

function installLegacyOverlayFallback() {
  if (window.__legacyOverlayFallbackInstalled) {
    return;
  }

  const languageOverlay = document.getElementById("language-overlay");
  const instructionModeOverlay = document.getElementById("instruction-mode-overlay");
  const textInstructionsOverlay = document.getElementById("text-instructions-overlay");
  const avatarOverlay = document.getElementById("avatar-overlay");
  const contractOverlay = document.getElementById("contract-overlay");
  const languageButtons = document.querySelectorAll("#language-overlay .language-option");
  const modeTextBtn = document.getElementById("mode-text-btn");
  const modeAvatarBtn = document.getElementById("mode-avatar-btn");
  const backInstructionModeBtn = document.getElementById("back-instruction-mode");
  const backTextInstructionsBtn = document.getElementById("back-text-instructions");
  const backAvatarOverlayBtn = document.getElementById("back-avatar-overlay");
  const backContractOverlayBtn = document.getElementById("back-contract-overlay");
  const textInstructionsContinueBtn = document.getElementById("text-instructions-continue");
  const avatarContinueBtn = document.getElementById("avatar-continue");
  const instructionModeTitle = document.getElementById("instruction-mode-title");
  const instructionModeDescription = document.getElementById("instruction-mode-description");
  const instructionModeStatus = document.getElementById("instruction-mode-status");
  const textInstructionsTitle = document.getElementById("text-instructions-title");
  const textInstructionsBody = document.getElementById("text-instructions-body");
  const avatarVideo = document.getElementById("avatar-video");
  const avatarVideoSource = document.getElementById("avatar-video-source");
  const languageTitleEl = document.getElementById("language-title");
  const contractTitleEl = document.getElementById("contract-title");
  const contractHelperTextEl = document.getElementById("contract-helper-text");
  const contractNumberLabelEl = document.getElementById("contract-number-label");
  const contractError = document.getElementById("contract-error");
  const submitContractBtn = document.getElementById("submit-contract-number");

  if (!languageOverlay || !instructionModeOverlay || !languageButtons.length) {
    return;
  }

  window.__legacyOverlayFallbackInstalled = true;

  const instructionModeTexts = {
    en: { title: "How would you like instructions?", description: "Choose between:", textButton: "Text", avatarButton: "Video" },
    tr: { title: "Talimatlari nasil almak istersiniz?", description: "Secim yap:", textButton: "Metin", avatarButton: "Video" },
    ru: { title: "Kak vy hotite poluchat instrukcii?", description: "Vyberite variant:", textButton: "Tekst", avatarButton: "Video" },
    fr: { title: "Comment souhaitez-vous recevoir les instructions ?", description: "Choisissez :", textButton: "Texte", avatarButton: "Video" },
    es: { title: "Como quieres recibir las instrucciones?", description: "Elige entre:", textButton: "Texto", avatarButton: "Video" },
    de: { title: "Wie möchtest du die Anweisungen erhalten?", description: "Wähle zwischen:", textButton: "Text", avatarButton: "Video" },
  };

  const contractTexts = {
    en: { title: "Kitchen contract number", helper: "Enter your purchase contract number.\nYou can find it on the inside of your sink cabinet.", label: "Please enter your contract number:*", confirm: "Confirm", error: "Contract number is required." },
    tr: { title: "Mutfak sozlesme numarasi", helper: "Satin alma sozlesme numarani gir.\nEvye dolabinin ic kisminda bulabilirsin.", label: "Lutfen sozlesme numarani gir:*", confirm: "Onayla", error: "Sozlesme numarasi gerekli." },
    ru: { title: "Nomer dogovora kuhni", helper: "Vvedite nomer dogovora pokupki.\nVy naidete ego na vnutrenney storone shkafa pod moykoy.", label: "Pozhaluysta, vvedite nomer dogovora:*", confirm: "Podtverdit", error: "Trebuetsya nomer dogovora." },
    fr: { title: "Numero de contrat de cuisine", helper: "Saisissez votre numero de contrat d achat.\nIl se trouve a l interieur du meuble evier.", label: "Veuillez saisir votre numero de contrat :*", confirm: "Confirmer", error: "Le numero de contrat est requis." },
    es: { title: "Numero de contrato de cocina", helper: "Introduce tu numero de contrato de compra.\nLo encuentras en la parte interior del mueble del fregadero.", label: "Introduce tu numero de contrato:*", confirm: "Confirmar", error: "El numero de contrato es obligatorio." },
    de: { title: "Küchenvertragsnummer", helper: "Gib deine Kaufvertragsnummer ein.\nDu findest sie auf der Innenseite deines Spülenschrankes.", label: "Bitte gib deine Vertragsnummer ein:*", confirm: "Bestätigen", error: "Die Vertragsnummer ist erforderlich." },
  };

  const instructionBodies = {
    en: { title: "Text instructions (English)", body: "Welcome to Fragmento by Architecto!" },
    tr: { title: "Metin talimatlari (Turkce)", body: "Fragmento by Architecto'ya hos geldiniz!" },
    ru: { title: "Tekstovye instrukcii (Russkiy)", body: "Dobro pozhalovat v Fragmento by Architecto!" },
    fr: { title: "Instructions texte (Francais)", body: "Bienvenue chez Fragmento by Architecto !" },
    es: { title: "Instrucciones en texto (Espanol)", body: "Bienvenido a Fragmento by Architecto!" },
    de: { title: "Textanweisungen (Deutsch)", body: "Willkommen bei Fragmento by Architecto!" },
  };

  let selectedLanguage = "en";
  let lastInstructionScreen = "text";

  const hideAll = () => {
    languageOverlay.classList.add("hidden");
    instructionModeOverlay.classList.add("hidden");
    textInstructionsOverlay?.classList.add("hidden");
    avatarOverlay?.classList.add("hidden");
    contractOverlay?.classList.add("hidden");
  };

  const updateStaticTexts = () => {
    const contractText = contractTexts[selectedLanguage] || contractTexts.en;
    if (languageTitleEl) languageTitleEl.textContent = "Wähle deine Sprache";
    if (contractTitleEl) contractTitleEl.textContent = contractText.title;
    if (contractHelperTextEl) contractHelperTextEl.textContent = contractText.helper;
    if (contractNumberLabelEl) contractNumberLabelEl.textContent = contractText.label;
    if (contractError) contractError.textContent = contractText.error;
    if (submitContractBtn) submitContractBtn.textContent = contractText.confirm;
  };

  const openInstructionModeOverlay = () => {
    const modeText = instructionModeTexts[selectedLanguage] || instructionModeTexts.en;
    hideAll();
    instructionModeOverlay.classList.remove("hidden");
    if (instructionModeTitle) instructionModeTitle.textContent = modeText.title;
    if (instructionModeDescription) instructionModeDescription.textContent = modeText.description;
    if (modeTextBtn) modeTextBtn.textContent = modeText.textButton;
    if (modeAvatarBtn) modeAvatarBtn.textContent = modeText.avatarButton;
    if (instructionModeStatus) instructionModeStatus.textContent = "";
  };

  const openTextInstructionsOverlay = () => {
    const content = instructionBodies[selectedLanguage] || instructionBodies.en;
    lastInstructionScreen = "text";
    hideAll();
    textInstructionsOverlay?.classList.remove("hidden");
    if (textInstructionsTitle) textInstructionsTitle.textContent = content.title;
    if (textInstructionsBody) textInstructionsBody.textContent = content.body;
  };

  const openAvatarOverlay = () => {
    const avatarSources = {
      en: `${AVATAR_BASE_PATH}/en-avatar.mp4`,
      tr: `${AVATAR_BASE_PATH}/tr-avatar.mp4`,
      de: `${AVATAR_BASE_PATH}/de-avatar.mp4`,
      es: `${AVATAR_BASE_PATH}/es-avatar.mp4`,
      ru: `${AVATAR_BASE_PATH}/ru-avatar.mp4`,
      fr: `${AVATAR_BASE_PATH}/fr-avatar.mp4`,
    };
    lastInstructionScreen = "avatar";
    hideAll();
    avatarOverlay?.classList.remove("hidden");
    const avatarSrc = avatarSources[selectedLanguage] || avatarSources.en;
    if (avatarVideoSource) {
      avatarVideoSource.setAttribute("src", avatarSrc);
      avatarVideo?.load();
    }
  };

  window.selectKitchenLanguage = (lang) => {
    selectedLanguage = lang || "en";
    updateStaticTexts();
    openInstructionModeOverlay();
  };

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.selectKitchenLanguage(button.dataset.lang || "en");
    });
  });

  modeTextBtn?.addEventListener("click", openTextInstructionsOverlay);
  modeAvatarBtn?.addEventListener("click", openAvatarOverlay);
  backInstructionModeBtn?.addEventListener("click", () => {
    hideAll();
    languageOverlay.classList.remove("hidden");
  });
  backTextInstructionsBtn?.addEventListener("click", openInstructionModeOverlay);
  backAvatarOverlayBtn?.addEventListener("click", openInstructionModeOverlay);
  textInstructionsContinueBtn?.addEventListener("click", () => {
    hideAll();
    contractOverlay?.classList.remove("hidden");
  });
  avatarContinueBtn?.addEventListener("click", () => {
    hideAll();
    contractOverlay?.classList.remove("hidden");
  });
  backContractOverlayBtn?.addEventListener("click", () => {
    if (lastInstructionScreen === "avatar") {
      openAvatarOverlay();
      return;
    }
    openTextInstructionsOverlay();
  });
}

export default function LegacyConfigurator({
  title,
  styles,
  bodyHtml,
  externalScripts,
  inlineScripts,
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    document.title = title || document.title;

    let cancelled = false;

    installLegacyOverlayFallback();

    const boot = async () => {
      for (const src of externalScripts) {
        if (cancelled) {
          return;
        }
        await loadExternalScriptSafe(src);
      }

      for (const code of inlineScripts) {
        if (cancelled) {
          return;
        }
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.dataset.legacyInline = "true";
        script.text = code;
        document.body.appendChild(script);
      }

      document.dispatchEvent(new Event("DOMContentLoaded"));
      installLegacyOverlayFallback();
      ensureLegacyCatalogRendered();
      window.setTimeout(() => {
        if (!cancelled) {
          ensureLegacyCatalogRendered();
        }
      }, 200);
    };

    boot().catch((error) => {
      console.error("Failed to boot legacy configurator", error);
      ensureLegacyCatalogRendered();
    });

    return () => {
      cancelled = true;
    };
  }, [externalScripts, inlineScripts, title]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <main dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
