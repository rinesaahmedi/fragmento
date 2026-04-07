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
  "kitchen-model-b": path.join(process.cwd(), "kitchen-svgs", "kitchen-model-b.svg"),
  "kitchen-model-c": path.join(process.cwd(), "kitchen-svgs", "kitchen-model-c.svg"),
};

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
  const svgPath = SVG_BY_SLUG[String(slug || "").trim().toLowerCase()];
  if (svgPath) {
    return loadSvgFromFile(svgPath);
  }

  return loadLegacySvgMarkup();
}
