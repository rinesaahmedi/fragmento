const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PLANS_DIR = path.join(process.cwd(), "public", "plans");
const RENDER_WIDTH = 3509;
const RENDER_HEIGHT = 2480;
const INK_THRESHOLD = 210;

function runs(flags, minLength = 1) {
  const output = [];
  let index = 0;
  while (index < flags.length) {
    if (!flags[index]) {
      index += 1;
      continue;
    }

    let end = index;
    while (end < flags.length && flags[end]) end += 1;
    if (end - index >= minLength) {
      output.push([index, end - 1, (index + end - 1) / 2]);
    }
    index = end;
  }
  return output;
}

function pct(value, total) {
  return Number((value / total * 100).toFixed(2));
}

async function renderPlanInk(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(RENDER_WIDTH, RENDER_HEIGHT, { fit: "fill" })
    .flatten({ background: "#fff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    isInk: (x, y) => data[y * info.width + x] < INK_THRESHOLD,
  };
}

function findLongVerticalLines(plan) {
  const verticals = [];
  const minRunLength = Math.floor(plan.height * 0.38);
  const startY = Math.floor(plan.height * 0.18);
  const endY = Math.floor(plan.height * 0.93);

  for (let x = 0; x < plan.width; x += 1) {
    const flags = new Uint8Array(plan.height);
    for (let y = startY; y < endY; y += 1) {
      flags[y] = plan.isInk(x, y) ? 1 : 0;
    }

    for (const [y0, y1] of runs(flags, minRunLength)) {
      verticals.push({ x, y0, y1 });
    }
  }

  return verticals.reduce((collapsed, line) => {
    const previous = collapsed[collapsed.length - 1];
    if (
      previous &&
      line.x - previous.x2 <= 3 &&
      Math.abs(line.y0 - previous.y0) < 8 &&
      Math.abs(line.y1 - previous.y1) < 8
    ) {
      previous.x2 = line.x;
      previous.x = (previous.x1 + previous.x2) / 2;
      previous.y0 = Math.min(previous.y0, line.y0);
      previous.y1 = Math.max(previous.y1, line.y1);
      return collapsed;
    }

    collapsed.push({
      x1: line.x,
      x2: line.x,
      x: line.x,
      y0: line.y0,
      y1: line.y1,
    });
    return collapsed;
  }, []);
}

function horizontalLineCenters(plan, left, right, top, bottom) {
  const rowHasLine = new Uint8Array(plan.height);
  for (
    let y = Math.max(0, top - 40);
    y <= Math.min(plan.height - 1, bottom + 40);
    y += 1
  ) {
    let inkCount = 0;
    for (let x = Math.floor(left); x <= Math.ceil(right); x += 1) {
      if (plan.isInk(x, y)) inkCount += 1;
    }
    rowHasLine[y] = inkCount > (right - left) * 0.35 ? 1 : 0;
  }

  return runs(rowHasLine, 1).map(([, , center]) => center);
}

function rankFridgeCandidates(plan, verticals) {
  const candidates = [];

  for (let i = 0; i < verticals.length; i += 1) {
    for (let j = i + 1; j < verticals.length; j += 1) {
      const first = verticals[i];
      const second = verticals[j];
      const left = Math.min(first.x, second.x);
      const right = Math.max(first.x, second.x);
      const width = right - left;
      if (width < plan.width * 0.06 || width > plan.width * 0.18) continue;

      const top = Math.max(first.y0, second.y0);
      const bottom = Math.min(first.y1, second.y1);
      const height = bottom - top;
      if (height < plan.height * 0.4 || height > plan.height * 0.7) continue;

      const rowCenters = horizontalLineCenters(plan, left, right, top, bottom);
      const topLine = rowCenters.find((y) => Math.abs(y - top) < 50);
      const bottomLine = [...rowCenters].reverse().find((y) => Math.abs(y - bottom) < 50);
      const midLine = rowCenters.find((y) => y > top + height * 0.45 && y < top + height * 0.75);
      if (!topLine || !midLine) continue;

      const centerX = (left + right) / 2;
      const edgeBonus = centerX < plan.width * 0.23 || centerX > plan.width * 0.45 ? 100000 : 0;
      const isRightFreestandingTower = centerX > plan.width * 0.65 && height > plan.height * 0.6;
      if (!bottomLine && !isRightFreestandingTower) continue;

      const resolvedBottom = bottomLine || bottom;
      const score =
        edgeBonus +
        height * 10 -
        Math.abs(width - plan.width * 0.115) -
        Math.abs(topLine / plan.height - 0.29) * 12000;

      candidates.push({
        left,
        top: topLine,
        width,
        height: resolvedBottom - topLine,
        score,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

async function detectFridgeHotspot(fileName) {
  const plan = await renderPlanInk(path.join(PLANS_DIR, fileName));
  const verticals = findLongVerticalLines(plan);
  const [best] = rankFridgeCandidates(plan, verticals);

  if (!best) {
    return { fileName, error: "No fridge candidate found" };
  }

  return {
    fileName,
    hotspot: {
      componentKey: "refrigerator",
      left: pct(best.left, plan.width),
      top: pct(best.top, plan.height),
      width: pct(best.width, plan.width),
      height: pct(best.height, plan.height),
    },
  };
}

async function main() {
  const files = fs
    .readdirSync(PLANS_DIR)
    .filter((fileName) => /^AB 105\d+\.svg$/.test(fileName))
    .sort();

  for (const fileName of files) {
    const result = await detectFridgeHotspot(fileName);
    if (result.error) {
      console.log(`${fileName}: ${result.error}`);
      continue;
    }
    console.log(`${fileName}: ${JSON.stringify(result.hotspot)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
