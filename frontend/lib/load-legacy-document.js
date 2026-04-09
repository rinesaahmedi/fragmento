import { promises as fs } from "fs";
import path from "path";

function extractMatch(input, regex) {
  const match = input.match(regex);
  return match ? match[1] : "";
}

function normalizeLegacyAssetPaths(input) {
  if (typeof input !== "string" || !input) {
    return input || "";
  }

  return input
    .replaceAll('src="img/', 'src="/img/')
    .replaceAll("src='img/", "src='/img/")
    .replaceAll('href="img/', 'href="/img/')
    .replaceAll("href='img/", "href='/img/")
    .replaceAll("url(img/", "url(/img/")
    .replaceAll("url('img/", "url('/img/")
    .replaceAll('url("img/', 'url("/img/')
    .replaceAll('"img/', '"/img/')
    .replaceAll("'img/", "'/img/")
    .replaceAll('"AVATAR/', '"/AVATAR/')
    .replaceAll("'AVATAR/", "'/AVATAR/");
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

function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeColorKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function buildComponentId(colorKey) {
  return `component-${colorKey.replace(/[^a-z0-9#]/gi, "").toLowerCase()}`;
}

function formatPrice(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function renderLegacyCatalogHtml(kitchenConfig) {
  if (!kitchenConfig) {
    return "";
  }

  const lockedComponentIds = new Set(
    [
      ...(kitchenConfig.lockedBaseColors || []),
      ...((kitchenConfig.components || []).filter((item) => item.isLocked && item.colorKey).map((item) => item.colorKey)),
    ]
      .map(normalizeColorKey)
      .filter(Boolean)
      .map(buildComponentId),
  );

  const parts = [];

  for (const item of kitchenConfig.components || []) {
    const colorKey = normalizeColorKey(item.colorKey);
    if (!colorKey) {
      continue;
    }

    const componentId = buildComponentId(colorKey);
    const infoMarkup = item.infoText
      ? `
                <button type="button" class="component-info-trigger" aria-label="Info zu ${escapeHtml(item.name)}" aria-expanded="false">i</button>
                <div class="component-info-tooltip">${escapeHtml(item.infoText)}</div>`
      : "";

    parts.push(`
            <li class="component-item${item.infoText ? " has-info" : ""}${lockedComponentIds.has(componentId) ? " selected" : ""}" data-target-id="${escapeHtml(componentId)}" data-code="${escapeHtml(item.code)}"${item.infoText ? ' data-has-info="true"' : ""}>
                <span class="selection-indicator"></span>
                <span class="component-icon">${LEGACY_ICON_MARKUP[item.iconKey] || ""}</span>
                <span class="component-name-wrap">
                    <span class="component-name">${escapeHtml(item.name)}</span>
                    ${infoMarkup}
                </span>
                <span class="component-price">${escapeHtml(formatPrice(item.price))}</span>
            </li>`);
  }

  if (kitchenConfig.accessories?.length) {
    parts.push(`
            <div class="list-divider"><h3>Zubehoer</h3></div>`);

    for (const item of kitchenConfig.accessories) {
      parts.push(`
            <li class="accessory-item" id="${escapeHtml(item.code || item.id)}" data-code="${escapeHtml(item.code || item.id)}" data-price="${escapeHtml(String(item.price ?? 0))}">
                <span class="selection-indicator"></span>
                <div class="accessory-icon">${LEGACY_ICON_MARKUP[item.iconKey] || ""}</div>
                <div class="accessory-details">
                    <span class="accessory-name">${escapeHtml(item.name)}</span>
                    <span class="accessory-price">${escapeHtml(formatPrice(item.price))}</span>
                </div>
            </li>`);
    }
  }

  if (kitchenConfig.services?.length) {
    parts.push(`
            <div class="list-divider"><h3>Dienstleistungen hinzufuegen</h3></div>`);

    for (const item of kitchenConfig.services) {
      parts.push(`
            <li class="accessory-item" id="${escapeHtml(item.code || item.id)}" data-code="${escapeHtml(item.code || item.id)}" data-price="${escapeHtml(String(item.price ?? 0))}">
                <span class="selection-indicator"></span>
                <div class="accessory-icon">${LEGACY_ICON_MARKUP[item.iconKey] || ""}</div>
                <div class="accessory-details">
                    <span class="accessory-name">${escapeHtml(item.name)}</span>
                    <span class="accessory-price">${escapeHtml(formatPrice(item.price))}</span>
                </div>
            </li>`);
    }
  }

  return parts.join("");
}

function injectKitchenConfig(script, kitchenConfig) {
  let nextScript = normalizeLegacyAssetPaths(script);

  nextScript = nextScript.replace(
    /function getComponentData\(color\) \{[\s\S]*?return dataMap\[color\?\.toLowerCase\(\)\] \|\| null;\s*\}/,
    `function getComponentData(color) {
        const dataMap = (window.__KITCHEN_CONFIG__?.components || []).reduce((acc, item) => {
            if (item.colorKey) {
                acc[item.colorKey.toLowerCase()] = {
                    ...item,
                    icon: icons[item.iconKey] || '',
                };
            }
            return acc;
        }, {});
        return dataMap[color?.toLowerCase()] || null;
    }`,
  );

  nextScript = nextScript.replace(
    `const lockedColors = ["springgreen", "red", "#7f001f", "#980026"];
    const lockedComponentIds = lockedColors.map(color => "component-" + color.replace(/[^a-z0-9#]/gi, '').toLowerCase());`,
    `const lockedColors = [
        ...((window.__KITCHEN_CONFIG__?.lockedBaseColors || [])),
        ...((window.__KITCHEN_CONFIG__?.components || []).filter(item => item.isLocked && item.colorKey).map(item => item.colorKey))
    ];
    const lockedComponentIds = lockedColors.map(color => "component-" + color.replace(/[^a-z0-9#]/gi, '').toLowerCase());`,
  );

  nextScript = nextScript.replace(
    /const accessories = \[[\s\S]*?\];\s*const services = \[[\s\S]*?\];/,
    `const accessories = (window.__KITCHEN_CONFIG__?.accessories || []).map(item => ({
        id: item.code,
        code: item.code,
        name: item.name,
        price: item.price,
        icon: icons[item.iconKey] || ''
    }));
    const services = (window.__KITCHEN_CONFIG__?.services || []).map(item => ({
        id: item.code,
        code: item.code,
        name: item.name,
        price: item.price,
        icon: icons[item.iconKey] || ''
    }));`,
  );

  nextScript = nextScript.replace(
    "g.dataset.componentId = componentId;",
    "g.dataset.componentId = componentId;\n        g.dataset.code = componentData?.code || '';",
  );

  nextScript = nextScript.replace(
    "li.dataset.targetId = componentId;",
    "li.dataset.targetId = componentId;\n            li.dataset.code = componentData.code || '';",
  );

  nextScript = nextScript.replace(
    "li.dataset.price = item.price;",
    "li.dataset.price = item.price;\n        li.dataset.code = item.code || item.id;",
  );

  nextScript = nextScript.replace(
    'const combinedList = document.getElementById("combined-list");',
    `const combinedList = document.getElementById("combined-list");
    const shouldBuildCatalogItems = !combinedList?.querySelector('.component-item, .accessory-item');`,
  );

  nextScript = nextScript.replace("if (componentData) {", "if (componentData && shouldBuildCatalogItems) {");

  nextScript = nextScript.replace(
    `const accessoryDivider = document.createElement('div');
    accessoryDivider.className = 'list-divider';
    accessoryDivider.innerHTML = '<h3>Zubehör</h3>';
    combinedList.appendChild(accessoryDivider);
    accessories.forEach(acc => combinedList.appendChild(createAccessoryListItem(acc)));

    const serviceDivider = document.createElement('div');
    serviceDivider.className = 'list-divider';
    serviceDivider.innerHTML = '<h3>Dienstleistungen hinzufügen</h3>';
    combinedList.appendChild(serviceDivider);
    services.forEach(service => combinedList.appendChild(createAccessoryListItem(service)));`,
    `if (shouldBuildCatalogItems) {
    const accessoryDivider = document.createElement('div');
    accessoryDivider.className = 'list-divider';
    accessoryDivider.innerHTML = '<h3>Zubehör</h3>';
    combinedList.appendChild(accessoryDivider);
    accessories.forEach(acc => combinedList.appendChild(createAccessoryListItem(acc)));

    const serviceDivider = document.createElement('div');
    serviceDivider.className = 'list-divider';
    serviceDivider.innerHTML = '<h3>Dienstleistungen hinzufügen</h3>';
    combinedList.appendChild(serviceDivider);
    services.forEach(service => combinedList.appendChild(createAccessoryListItem(service)));
    }`,
  );

  nextScript = nextScript.replace(
    /function getSelections\(\) \{[\s\S]*?return \{ components, accessories, services, total \};\s*\}/,
    `function getSelections() {
        const components = Array.from(document.querySelectorAll('#combined-list .component-item.selected')).map(li => ({
            code: li.dataset.code || '',
            name: li.querySelector('.component-name')?.textContent?.trim(),
            price: parsePrice(li.querySelector('.component-price')?.textContent)
        }));
        const accessories = Array.from(document.querySelectorAll('#combined-list .accessory-item[id^="acc-"].selected')).map(li => ({
            code: li.dataset.code || li.id,
            name: li.querySelector('.accessory-name')?.textContent?.trim(),
            price: parsePrice(li.dataset.price)
        }));
        const services = Array.from(document.querySelectorAll('#combined-list .accessory-item[id^="service-"].selected')).map(li => ({
            code: li.dataset.code || li.id,
            name: li.querySelector('.accessory-name')?.textContent?.trim(),
            price: parsePrice(li.dataset.price)
        }));
        const total = [...components, ...accessories, ...services].reduce((s, i) => s + i.price, 0);
        return { components, accessories, services, total };
    }`,
  );

  nextScript = nextScript.replace(
    "const response = await fetch('/.netlify/functions/send-email', {",
    "const response = await fetch('/api/orders', {",
  );

  nextScript = nextScript.replace(
    `body: JSON.stringify({
          to_name: \`\${order.customer.firstName} \${order.customer.lastName}\`,
          to_email: order.customer.email,
          order_number: order.orderNumber,
          order_summary_html: buildOrderSummaryHTML(order),
          pdf_base64: base64,
          pdf_filename: pdfFilename,
          webhook_payload: {
            customer: order.customer,
            totalPrice: order.total,
            components: [ ...order.components, ...order.accessories, ...order.services ],
          },
        })`,
    `body: JSON.stringify({
          kitchen_slug: window.__KITCHEN_CONFIG__?.kitchen?.slug,
          order_payload: order,
          pdf_base64: base64,
          pdf_filename: pdfFilename
        })`,
  );

  nextScript = nextScript
    .replaceAll("/.netlify/functions/send-email", "/api/orders")
    .replaceAll("/.netlify/functions/forward-webhook", "/api/forward-webhook");

  return [
    `window.__KITCHEN_CONFIG__ = ${JSON.stringify(kitchenConfig)};`,
    nextScript,
  ];
}

export async function loadLegacyDocument({ kitchenConfig } = {}) {
  const htmlPath = path.join(process.cwd(), "index.html");
  const rawHtml = await fs.readFile(htmlPath, "utf8");

  const title = extractMatch(rawHtml, /<title>([\s\S]*?)<\/title>/i).trim();
  const styles = extractMatch(rawHtml, /<style>([\s\S]*?)<\/style>/i);
  const bodyInner = extractMatch(rawHtml, /<body[^>]*>([\s\S]*?)<\/body>/i);

  const scriptMatches = [...bodyInner.matchAll(/<script(?:\s+src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/gi)];
  const externalScripts = scriptMatches.map((match) => normalizeLegacyAssetPaths(match[1])).filter(Boolean);
  const inlineScripts = scriptMatches.map((match) => normalizeLegacyAssetPaths(match[2]?.trim() || "")).filter(Boolean);

  const transformedInlineScripts = kitchenConfig
    ? inlineScripts.flatMap((script, index) => (index === 0 ? injectKitchenConfig(script, kitchenConfig) : [script]))
    : inlineScripts.map((script) =>
        normalizeLegacyAssetPaths(script)
          .replaceAll("/.netlify/functions/send-email", "/api/send-email")
          .replaceAll("/.netlify/functions/forward-webhook", "/api/forward-webhook"),
      );

  const catalogHtml = kitchenConfig ? renderLegacyCatalogHtml(kitchenConfig) : "";
  const bodyHtml = normalizeLegacyAssetPaths(
    bodyInner
      .replace(/<script(?:\s+src="[^"]+")?[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<ul id="combined-list"><\/ul>/i, `<ul id="combined-list">${catalogHtml}</ul>`)
      .trim(),
  );

  return {
    title: kitchenConfig?.kitchen?.name ? `${kitchenConfig.kitchen.name} | ${title}` : title,
    styles: normalizeLegacyAssetPaths(styles),
    bodyHtml,
    externalScripts,
    inlineScripts: transformedInlineScripts,
  };
}
