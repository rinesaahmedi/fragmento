const COLOR_SCORE_THRESHOLD = 2;
const RENDER_STRIP_THRESHOLD = 100;

let pdfJsPromise;

async function loadPdfJs() {
  if (!pdfJsPromise) {
    // PDF.js ships a Webpack-specific entrypoint which creates the module
    // worker correctly. Importing the generic/legacy bundle through Next's
    // chunk loader can fail in Chrome before a document is opened.
    pdfJsPromise = import("pdfjs-dist/webpack.mjs");
  }
  return pdfJsPromise;
}

export function parseAbCodeFromPdfName(fileName) {
  const matches = [...String(fileName || "").matchAll(/(?:^|[^A-Z0-9])AB[-_ ]*(\d{6})(?=$|[^0-9])/gi)];
  const codes = [...new Set(matches.map((match) => match[1]))];
  return codes.length === 1 ? codes[0] : null;
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

async function renderPage(page, scale) {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

function pageColorScore(canvas) {
  const { data } = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  let coloured = 0;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (maximum - minimum > 35 && maximum < 245) coloured += 1;
  }
  return Math.round((coloured * 10000) / (canvas.width * canvas.height)) / 100;
}

async function renderStripCount(page, pdfjs) {
  const operatorList = await page.getOperatorList();
  let count = 0;
  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const operation = operatorList.fnArray[index];
    if (operation !== pdfjs.OPS.paintImageXObject && operation !== pdfjs.OPS.paintInlineImageXObject) continue;
    const args = operatorList.argsArray[index] || [];
    const width = Number(args[1] || args[0]?.width || 0);
    const height = Number(args[2] || args[0]?.height || 0);
    if (width >= 500 && height <= 12) count += 1;
  }
  return count;
}

async function openPdf(file) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const documentProxy = await pdfjs.getDocument({ data }).promise;
  return { pdfjs, documentProxy };
}

export async function analyzeArcPdf(file, onPage) {
  const { pdfjs, documentProxy } = await openPdf(file);
  const candidates = [];
  const scores = [];
  try {
    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      const page = await documentProxy.getPage(pageNumber);
      const preview = await renderPage(page, 0.18);
      const [colourScore, stripCount] = await Promise.all([
        Promise.resolve(pageColorScore(preview)),
        renderStripCount(page, pdfjs),
      ]);
      const confidence = Math.max(colourScore, stripCount / 50);
      scores.push({ pageNumber, colourScore, stripCount, confidence });
      if (colourScore >= COLOR_SCORE_THRESHOLD || stripCount >= RENDER_STRIP_THRESHOLD) {
        candidates.push(pageNumber);
      }
      onPage?.(pageNumber, documentProxy.numPages);
    }
    return { pageCount: documentProxy.numPages, candidates, scores };
  } finally {
    await documentProxy.destroy();
  }
}

function rotateClockwise(source) {
  const canvas = createCanvas(source.height, source.width);
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(source, 0, 0);
  return canvas;
}

function removeFooter(source) {
  const context = source.getContext("2d", { willReadFrequently: true });
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  let footerStart = Math.floor(source.height * 0.9);
  const firstRow = Math.floor(source.height * 0.86);
  const lastRow = Math.floor(source.height * 0.96);
  for (let y = firstRow; y < lastRow; y += 1) {
    let darkPixels = 0;
    let offset = y * source.width * 4;
    for (let x = 0; x < source.width; x += 1, offset += 4) {
      const gray = (pixels[offset] * 0.299) + (pixels[offset + 1] * 0.587) + (pixels[offset + 2] * 0.114);
      if (gray < 200) darkPixels += 1;
    }
    if (darkPixels >= source.width * 0.6) {
      footerStart = y;
      break;
    }
  }
  const canvas = createCanvas(source.width, Math.max(1, footerStart - 3));
  canvas.getContext("2d", { alpha: false, willReadFrequently: true }).drawImage(
    source,
    0,
    0,
    source.width,
    canvas.height,
    0,
    0,
    source.width,
    canvas.height,
  );
  return canvas;
}

function tightCrop(source) {
  const width = source.width;
  const height = source.height;
  const context = source.getContext("2d", { willReadFrequently: true });
  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const frameStrip = Math.max(24, Math.floor(Math.min(width, height) * 0.035));
  let head = 0;
  let tail = 0;

  function isExteriorCandidate(pixelIndex) {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x < frameStrip || y < frameStrip || x >= width - frameStrip || y >= height - frameStrip) return true;
    const offset = pixelIndex * 4;
    return Math.min(data[offset], data[offset + 1], data[offset + 2]) >= 250;
  }

  function enqueue(pixelIndex) {
    if (pixelIndex < 0 || pixelIndex >= exterior.length || exterior[pixelIndex] || !isExteriorCandidate(pixelIndex)) return;
    exterior[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (pixelIndex >= width) enqueue(pixelIndex - width);
    if (pixelIndex < width * (height - 1)) enqueue(pixelIndex + width);
  }

  for (let pixelIndex = 0; pixelIndex < exterior.length; pixelIndex += 1) {
    if (!exterior[pixelIndex]) continue;
    const offset = pixelIndex * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);

  const guard = Math.max(28, Math.floor(Math.min(width, height) * 0.045));
  const innerLeft = guard;
  const innerTop = guard;
  const innerRight = width - guard;
  const innerBottom = height - guard;
  const columnThreshold = Math.max(10, Math.floor((innerBottom - innerTop) * 0.025));
  const rowThreshold = Math.max(10, Math.floor((innerRight - innerLeft) * 0.025));
  let firstColumn = -1;
  let lastColumn = -1;
  let firstRow = -1;
  let lastRow = -1;

  for (let x = innerLeft; x < innerRight; x += 1) {
    let occupied = 0;
    for (let y = innerTop; y < innerBottom; y += 1) occupied += exterior[y * width + x] ? 0 : 1;
    if (occupied >= columnThreshold) {
      if (firstColumn < 0) firstColumn = x;
      lastColumn = x;
    }
  }
  for (let y = innerTop; y < innerBottom; y += 1) {
    let occupied = 0;
    for (let x = innerLeft; x < innerRight; x += 1) occupied += exterior[y * width + x] ? 0 : 1;
    if (occupied >= rowThreshold) {
      if (firstRow < 0) firstRow = y;
      lastRow = y;
    }
  }
  if (firstColumn < 0 || firstRow < 0) return source;

  const contentWidth = lastColumn - firstColumn + 1;
  const contentHeight = lastRow - firstRow + 1;
  const horizontalBorder = Math.max(24, Math.floor(contentWidth * 0.04));
  const verticalBorder = Math.max(16, Math.floor(contentHeight * 0.03));
  const left = Math.max(0, firstColumn - horizontalBorder);
  const top = Math.max(0, firstRow - verticalBorder);
  const right = Math.min(width, lastColumn + 1 + horizontalBorder);
  const bottom = Math.min(height, lastRow + 1 + verticalBorder);
  const canvas = createCanvas(right - left, bottom - top);
  const cropContext = canvas.getContext("2d", { alpha: false });
  cropContext.fillStyle = "#fff";
  cropContext.fillRect(0, 0, canvas.width, canvas.height);
  cropContext.drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create the kitchen JPG."));
    }, "image/jpeg", 0.96);
  });
}

async function digestBlob(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createArcProductImage(file, pageNumber, cropMode = "tight") {
  const { documentProxy } = await openPdf(file);
  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > documentProxy.numPages) {
      throw new Error("Select a valid render page.");
    }
    const page = await documentProxy.getPage(pageNumber);
    const rendered = await renderPage(page, 2);
    const footerFree = removeFooter(rotateClockwise(rendered));
    const output = cropMode === "full" ? footerFree : tightCrop(footerFree);
    const blob = await canvasToJpeg(output);
    return {
      blob,
      byteLength: blob.size,
      sha256: await digestBlob(blob),
      width: output.width,
      height: output.height,
    };
  } finally {
    await documentProxy.destroy();
  }
}
