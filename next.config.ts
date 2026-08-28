import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env manually for Turbopack compatibility (merge with process.env, don't override)
const envPath = join(process.cwd(), '.env');
const envFile: Record<string, string> = {};
if (existsSync(envPath)) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        envFile[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
  } catch { /* ignore */ }
} else {
  // No .env file: pass through DATABASE_URL and JWT_SECRET from system env
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'CRON_SECRET']) {
    if (process.env[key]) envFile[key] = process.env[key]!
  }
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
