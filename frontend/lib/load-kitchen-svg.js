import { promises as fs } from "fs";
import path from "path";

function normalizeAssetPaths(input) {
  return input
    .replaceAll('src="img/', 'src="/img/')
    .replaceAll("src='img/", "src='/img/")
    .replaceAll('"img/', '"/img/')
    .replaceAll("'img/", "'/img/");
}

export async function loadKitchenSvgMarkup() {
  const htmlPath = path.join(process.cwd(), "index.html");
  const rawHtml = await fs.readFile(htmlPath, "utf8");
  const match = rawHtml.match(/<div id="kitchen-svg-wrapper">[\s\S]*?(<svg[\s\S]*?<\/svg>)[\s\S]*?<\/div>/i);

  if (!match?.[1]) {
    throw new Error("Kitchen SVG markup not found in legacy document.");
  }

  return normalizeAssetPaths(match[1].trim());
}
