import { promises as fs } from "fs";
import path from "path";

function extractMatch(input, regex) {
  const match = input.match(regex);
  return match ? match[1] : "";
}

function injectKitchenConfig(script, kitchenConfig) {
  let nextScript = script;

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
  const externalScripts = scriptMatches.map((match) => match[1]).filter(Boolean);
  const inlineScripts = scriptMatches.map((match) => match[2]?.trim()).filter(Boolean);

  const transformedInlineScripts = kitchenConfig
    ? inlineScripts.flatMap((script, index) => (index === 0 ? injectKitchenConfig(script, kitchenConfig) : [script]))
    : inlineScripts.map((script) =>
        script
          .replaceAll("/.netlify/functions/send-email", "/api/send-email")
          .replaceAll("/.netlify/functions/forward-webhook", "/api/forward-webhook"),
      );

  const bodyHtml = bodyInner.replace(/<script(?:\s+src="[^"]+")?[^>]*>[\s\S]*?<\/script>/gi, "").trim();

  return {
    title: kitchenConfig?.kitchen?.name ? `${kitchenConfig.kitchen.name} | ${title}` : title,
    styles,
    bodyHtml,
    externalScripts,
    inlineScripts: transformedInlineScripts,
  };
}
