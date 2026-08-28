import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Parse a .env-style file into a key-value Record */
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!existsSync(filePath)) return result;
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }
  } catch { /* ignore */ }
  return result;
}

// Load env files: .env.local > .env > system env
const envFile: Record<string, string> = {
  ...parseEnvFile(join(process.cwd(), '.env')),
  ...parseEnvFile(join(process.cwd(), '.env.local')),
};

// If neither file has DATABASE_URL, fall back to system env
if (!envFile.DATABASE_URL && process.env.DATABASE_URL) {
  envFile.DATABASE_URL = process.env.DATABASE_URL;
}
for (const key of ['JWT_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'CRON_SECRET']) {
  if (!envFile[key] && process.env[key]) envFile[key] = process.env[key]!;
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['preview-chat-7ebde8f6-efcb-49e0-a57f-98f745913b44.space-z.ai', '21.0.11.132', '21.0.16.38', '21.0.18.181', '127.0.0.1'],
  env: envFile,
};

export default nextConfig;
