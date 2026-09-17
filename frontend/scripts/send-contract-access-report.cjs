const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.production") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  if (process.env.CONTRACT_ACCESS_REPORT_ENABLED !== "true") {
    throw new Error("Contract access report is disabled outside the Hetzner report service.");
  }

  const [{ prisma }, { sendAscAccessReport, sendContractAccessReport }] = await Promise.all([
    import("../lib/prisma.js"),
    import("../lib/email/contract-access-report.js"),
  ]);

  try {
    const result = await sendContractAccessReport({ db: prisma });
    console.log(`Contract access report sent to ${result.recipients.join(", ")}: ${result.count} attempts.`);
    const ascResult = await sendAscAccessReport({ db: prisma });
    console.log(`ASC access report sent to ${ascResult.recipients.join(", ")}: ${ascResult.count} lookups.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Contract access report failed:", error);
  process.exitCode = 1;
});
