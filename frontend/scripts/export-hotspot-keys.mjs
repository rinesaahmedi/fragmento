import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient, ItemType } from "@prisma/client";
import { buildComponentSlotKeys, extractCalloutsFromPdf } from "../lib/kitchen-hotspots.js";

const slug = process.argv[2] || "105811";
const prisma = new PrismaClient();

const kitchen = await prisma.kitchen.findFirst({
  where: { slug },
  include: { items: { where: { itemType: ItemType.COMPONENT, isActive: true } } },
});

const pdfPath = path.join(process.cwd(), "public", "pdfs", `AB ${slug}.pdf`);
const callouts = extractCalloutsFromPdf(pdfPath);
const keys = buildComponentSlotKeys(kitchen.items, callouts);
const keysFile = path.join(os.tmpdir(), `keys-${slug}.json`);
const calloutsFile = path.join(os.tmpdir(), `callouts-${slug}.json`);
fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
fs.writeFileSync(calloutsFile, JSON.stringify(callouts, null, 2));
console.log(keysFile);
console.log(calloutsFile);

await prisma.$disconnect();
