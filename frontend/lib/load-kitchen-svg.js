import { promises as fs } from "fs";
import path from "path";

function normalizeAssetPaths(input) {
  return input
    .replaceAll('src="img/', 'src="/img/')
    .replaceAll("src='img/", "src='/img/")
    .replaceAll('"img/', '"/img/')
    .replaceAll("'img/", "'/img/");
}

const SVG_BY_SLUG = {
  "kitchen-model-b": path.join(process.cwd(), "kitchen-svgs", "active", "kitchen-model-b.svg"),
  "kitchen-model-c": path.join(process.cwd(), "kitchen-svgs", "active", "kitchen-model-c.svg"),
  "l-kitchen-new": path.join(process.cwd(), "kitchen-svgs", "active", "l-kitchen-new.svg"),
  "l-shaped-kitchen": path.join(process.cwd(), "kitchen-svgs", "active", "l-shaped-kitchen.svg"),
  "ab-105808": path.join(process.cwd(), "public", "plans", "AB 105808.svg"),
  "ab-105845": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "105845-modul-2": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "test-3d-kitchen": path.join(process.cwd(), "kitchen-svgs", "active", "test-3d-kitchen.svg"),
};

function resolveAbPlanSvgPath(slug) {
  const match = String(slug || "").trim().toLowerCase().match(/^ab-(\d{6})$/);
  if (!match) {
    return "";
  }

  return path.join(process.cwd(), "public", "plans", `AB ${match[1]}.svg`);
}

async function loadSvgFromFile(filePath) {
  return normalizeAssetPaths((await fs.readFile(filePath, "utf8")).trim());
}

async function loadLegacySvgMarkup() {
  const htmlPath = path.join(process.cwd(), "index.html");
  const rawHtml = await fs.readFile(htmlPath, "utf8");
  const match = rawHtml.match(/<div id="kitchen-svg-wrapper">[\s\S]*?(<svg[\s\S]*?<\/svg>)[\s\S]*?<\/div>/i);

  if (!match?.[1]) {
    throw new Error("Kitchen SVG markup not found in legacy document.");
  }

  return normalizeAssetPaths(match[1].trim());
}

export async function loadKitchenSvgMarkup(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const svgPath = SVG_BY_SLUG[normalizedSlug];
  if (svgPath) {
    return loadSvgFromFile(svgPath);
  }

  const abPlanSvgPath = resolveAbPlanSvgPath(normalizedSlug);
  if (abPlanSvgPath) {
    try {
      await fs.access(abPlanSvgPath);
      return loadSvgFromFile(abPlanSvgPath);
    } catch {
      // Fall back to the legacy drawing for older slugs that do not have a plan asset.
    }
  }

  return loadLegacySvgMarkup();
}
