import { PrismaClient } from "@prisma/client";
import path from "path";
import { extractCalloutsFromPdf } from "../lib/kitchen-hotspots.js";

const prisma = new PrismaClient();
const slug = process.argv[2] || "105822";
const kitchen = await prisma.kitchen.findFirst({
  where: { slug },
  select: { slug: true, planPdfPath: true, planImagePath: true, hotspots: true },
});
console.log("slug", kitchen?.slug);
console.log("pdf", kitchen?.planPdfPath);
console.log("plan", kitchen?.planImagePath);
if (kitchen?.planPdfPath) {
  const pdf = path.join(
    process.cwd(),
    "public",
    ...decodeURIComponent(kitchen.planPdfPath.replace(/^\//, "")).split("/"),
  );
  console.log("pdfPath", pdf);
  console.log("callouts", extractCalloutsFromPdf(pdf).length);
}
for (const h of kitchen?.hotspots || []) {
  console.log(
    `${h.componentKey}: L${h.left} T${h.top} W${h.width} H${h.height}`,
  );
}
await prisma.$disconnect();
