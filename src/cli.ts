#!/usr/bin/env node
import { loadConfig } from './config';
import { runAction } from './runner';
import { ActionConfig, AIProviderType, ReleaseNotesStyle } from './types';

function parseArgs(): Partial<ActionConfig> {
  const args = process.argv.slice(2);
  const overrides: Partial<ActionConfig> = {};

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Apple Store AI Connect CLI
Generate App Store release notes & metadata using Gemini, Claude, or OpenAI, and update App Store Connect.

Usage:
  npx appstore-ai [options]

Options:
  --provider <name>      AI Provider: 'gemini' (default), 'claude', 'openai'
  --model <model>        Model name (e.g. gemini-2.0-flash, claude-3-7-sonnet, gpt-4o)
  --api-key <key>        AI API Key (or set GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY)
  --app-id <id>          Apple App Store App ID
  --key-id <id>          App Store Connect Key ID
  --issuer-id <uuid>     App Store Connect Issuer ID
  --private-key <p8>     Private key PEM or file path
  --version <ver>        Target iOS version string (e.g. '1.2.0')
  --locales <list>       Comma-separated locales (e.g. 'en-US,tr') [default: en-US]
  --style <style>        Style: 'bullet-points', 'emojis', 'minimal', 'detailed'
  --git-since <ref>      Git ref/tag to analyze (default: 'auto')
  --save-to-disk <path>  Save metadata files locally (e.g. 'fastlane/metadata')
  --dry-run              Preview generated release notes without touching App Store Connect
  --help, -h             Show this help message

Environment Variables:
  GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
  APP_STORE_APP_ID, APP_STORE_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_PRIVATE_KEY
    `);
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--provider' && next) { overrides.provider = next as AIProviderType; i++; }
    else if (arg === '--model' && next) { overrides.model = next; i++; }
    else if (arg === '--api-key' && next) { overrides.apiKey = next; i++; }
    else if (arg === '--app-id' && next) { overrides.appId = next; i++; }
    else if (arg === '--key-id' && next) { overrides.ascKeyId = next; i++; }
    else if (arg === '--issuer-id' && next) { overrides.ascIssuerId = next; i++; }
    else if (arg === '--private-key' && next) { overrides.ascPrivateKey = next; i++; }
    else if (arg === '--version' && next) { overrides.version = next; i++; }
    else if (arg === '--locales' && next) { overrides.locales = next.split(',').map(s => s.trim()); i++; }
    else if (arg === '--style' && next) { overrides.style = next as ReleaseNotesStyle; i++; }
    else if (arg === '--git-since' && next) { overrides.gitSince = next; i++; }
    else if (arg === '--save-to-disk' && next) { overrides.saveToDisk = next; i++; }
    else if (arg === '--dry-run') { overrides.dryRun = true; }
  }

  return overrides;
}

async function cli() {
  try {
    const overrides = parseArgs();
    const config = loadConfig(overrides);
    await runAction(config);
    process.exit(0);
  } catch (error: any) {
    console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
    process.exit(1);
  }
}

cli();
