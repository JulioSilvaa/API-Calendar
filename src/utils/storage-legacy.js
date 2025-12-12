import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(TOKENS_FILE);
  } catch {
    await fs.writeFile(TOKENS_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

export async function loadTokens() {
  await ensureDataDir();
  const raw = await fs.readFile(TOKENS_FILE, "utf-8");
  return JSON.parse(raw || "{}");
}

export async function saveTokens(tokensByEmail) {
  await ensureDataDir();
  await fs.writeFile(
    TOKENS_FILE,
    JSON.stringify(tokensByEmail, null, 2),
    "utf-8"
  );
}

export async function upsertUserTokens(email, tokenPayload) {
  const tokens = await loadTokens();
  tokens[email] = {
    ...(tokens[email] || {}),
    ...tokenPayload,
    updatedAt: new Date().toISOString(),
  };
  await saveTokens(tokens);
  return tokens[email];
}

export async function getUserTokens(email) {
  const tokens = await loadTokens();
  return tokens[email];
}
