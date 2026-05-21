const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

for (const envPath of [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
]) {
  loadEnvFile(envPath);
}

const prisma = new PrismaClient();

async function syncAdminUser(email, password, label) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`${label} synced for ${email}`);
}

async function main() {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is missing in frontend/.env");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is missing in frontend/.env");
  }

  await syncAdminUser(adminEmail, adminPassword, "Primary admin user");

  const claimsEmail = String(process.env.ADMIN_CLAIMS_EMAIL || "").trim();
  const claimsPassword = String(process.env.ADMIN_CLAIMS_PASSWORD || "");

  if (claimsEmail || claimsPassword) {
    if (!claimsEmail) {
      throw new Error("ADMIN_CLAIMS_EMAIL is missing but ADMIN_CLAIMS_PASSWORD is set in frontend/.env");
    }
    if (!claimsPassword) {
      throw new Error("ADMIN_CLAIMS_PASSWORD is missing but ADMIN_CLAIMS_EMAIL is set in frontend/.env");
    }

    await syncAdminUser(claimsEmail, claimsPassword, "Claims admin user");

    const allowedClaimsEmails = String(process.env.ADMIN_CLAIMS_ACCESS_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedClaimsEmails.includes(claimsEmail.toLowerCase())) {
      console.warn(
        `Warning: ${claimsEmail} is not listed in ADMIN_CLAIMS_ACCESS_EMAILS, so that account will not see Claims.`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
